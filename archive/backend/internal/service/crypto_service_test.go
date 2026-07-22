package service

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/patrickmn/go-cache"
)

const testCryptoKey = "test-cmc-key-xyz789"

const cryptoSuccessBody = `{"data":[
	{"id":1,"name":"Bitcoin","symbol":"BTC","quote":{"USD":{"price":65000.5,"percent_change_24h":1.2}}},
	{"id":1027,"name":"Ethereum","symbol":"ETH","quote":{"USD":{"price":3200.25,"percent_change_24h":-0.5}}}
]}`

func newCryptoServer(t *testing.T, handler http.HandlerFunc) (*httptest.Server, *int32) {
	t.Helper()
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		handler(w, r)
	}))
	t.Cleanup(srv.Close)
	return srv, &hits
}

func TestFetchCrypto_SuccessCacheAndHeader(t *testing.T) {
	var sawHeader atomic.Bool
	srv, hits := newCryptoServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-CMC_PRO_API_KEY") == testCryptoKey {
			sawHeader.Store(true)
		}
		if r.URL.Path != "/v1/cryptocurrency/listings/latest" {
			t.Errorf("unexpected upstream path: %s", r.URL.Path)
		}
		fmt.Fprint(w, cryptoSuccessBody)
	})

	s := NewCryptoService(srv.URL, testCryptoKey)

	data, err := s.FetchCrypto()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data) != 2 || data[0].Symbol != "BTC" || data[0].Quote.USD.Price != 65000.5 {
		t.Fatalf("crypto data not parsed correctly: %+v", data)
	}
	if !sawHeader.Load() {
		t.Fatal("expected X-CMC_PRO_API_KEY header to be present on upstream request")
	}

	// Second call served from cache; no new upstream hit.
	if _, err := s.FetchCrypto(); err != nil {
		t.Fatalf("unexpected error on cached call: %v", err)
	}
	if got := atomic.LoadInt32(hits); got != 1 {
		t.Fatalf("expected exactly 1 upstream hit, got %d", got)
	}
}

func TestFetchCrypto_Non200IsUpstream(t *testing.T) {
	srv, _ := newCryptoServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	})

	s := NewCryptoService(srv.URL, testCryptoKey)

	_, err := s.FetchCrypto()
	if err == nil {
		t.Fatal("expected an error on non-200 upstream")
	}
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchCrypto_PoisonedCacheDoesNotPanic(t *testing.T) {
	srv, _ := newCryptoServer(t, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, cryptoSuccessBody)
	})

	s := NewCryptoService(srv.URL, testCryptoKey)
	s.cache.Set(cryptoCacheKey, 12345, cache.DefaultExpiration)

	data, err := s.FetchCrypto()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data) != 2 {
		t.Fatalf("expected a fresh fetch after poisoned cache, got %+v", data)
	}
}

func TestFetchCrypto_SingleflightCoalesces(t *testing.T) {
	srv, hits := newCryptoServer(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		fmt.Fprint(w, cryptoSuccessBody)
	})

	s := NewCryptoService(srv.URL, testCryptoKey)

	const n = 10
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, err := s.FetchCrypto()
			errs <- err
		}()
	}
	close(start)
	wg.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("unexpected error in concurrent fetch: %v", err)
		}
	}
	if got := atomic.LoadInt32(hits); got != 1 {
		t.Fatalf("expected exactly 1 coalesced upstream hit, got %d", got)
	}
}
