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

	"github.com/mylordkaz/currencyConverter/backend/internal/models"
	"github.com/patrickmn/go-cache"
)

const testFiatKey = "test-fiat-key-abc123"

// fiatSuccessBody returns a well-formed ExchangeRate-API success payload whose
// provider update time is `lastUpdate`.
func fiatSuccessBody(lastUpdate int64) string {
	return fmt.Sprintf(
		`{"result":"success","base_code":"USD","conversion_rates":{"USD":1,"EUR":0.9,"JPY":150.5},"time_last_update_unix":%d}`,
		lastUpdate,
	)
}

// newFiatServer spins up a fake ExchangeRate-API endpoint. handler decides the
// response; hits counts every request that reaches the server.
func newFiatServer(t *testing.T, handler http.HandlerFunc) (*httptest.Server, *int32) {
	t.Helper()
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		handler(w, r)
	}))
	t.Cleanup(srv.Close)
	return srv, &hits
}

func TestFetchCurrencies_SuccessAndCache(t *testing.T) {
	now := time.Now().Unix()
	srv, hits := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v6/"+testFiatKey+"/latest/USD" {
			t.Errorf("unexpected upstream path: %s", r.URL.Path)
		}
		fmt.Fprint(w, fiatSuccessBody(now))
	})

	s := NewCurrencyService(srv.URL, testFiatKey)

	rates, err := s.FetchCurrencies("USD")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rates.Base != "USD" || rates.Rates["EUR"] != 0.9 || rates.Rates["JPY"] != 150.5 {
		t.Fatalf("rates not parsed correctly: %+v", rates)
	}

	// Second call must be served from cache (fresh data), no new upstream hit.
	if _, err := s.FetchCurrencies("USD"); err != nil {
		t.Fatalf("unexpected error on cached call: %v", err)
	}
	if got := atomic.LoadInt32(hits); got != 1 {
		t.Fatalf("expected exactly 1 upstream hit, got %d", got)
	}
}

func TestFetchCurrencies_Non200IsUpstream(t *testing.T) {
	srv, _ := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	s := NewCurrencyService(srv.URL, testFiatKey)

	_, err := s.FetchCurrencies("USD")
	if err == nil {
		t.Fatal("expected an error on non-200 upstream")
	}
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchCurrencies_NonSuccessBody(t *testing.T) {
	srv, _ := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"result":"error","error-type":"invalid-key"}`)
	})

	s := NewCurrencyService(srv.URL, testFiatKey)

	_, err := s.FetchCurrencies("USD")
	if err == nil {
		t.Fatal("expected an error when result != success")
	}
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

// Stale provider data but a recent fetch (within the cooldown) must be served
// straight from cache with no upstream call. (spec 03 §1)
func TestFetchCurrencies_StaleButCooldownActive(t *testing.T) {
	srv, hits := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, fiatSuccessBody(time.Now().Unix()))
	})

	s := NewCurrencyService(srv.URL, testFiatKey)

	now := time.Now().Unix()
	seeded := &models.ExchangeRates{Base: "USD", Rates: map[string]float64{"EUR": 0.8}}
	s.cache.Set("fiat_rates_USD", &CachedRates{
		Rates:          seeded,
		LastUpdateUnix: now - 25*60*60, // 25h old -> provider data stale
		FetchedAtUnix:  now - 60,       // fetched 1 min ago -> cooldown active
	}, cache.NoExpiration)

	rates, err := s.FetchCurrencies("USD")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rates.Rates["EUR"] != 0.8 {
		t.Fatalf("expected seeded stale rates, got %+v", rates)
	}
	if got := atomic.LoadInt32(hits); got != 0 {
		t.Fatalf("expected 0 upstream hits during cooldown, got %d", got)
	}
}

// Stale data, cooldown expired, upstream then fails: exactly one upstream call
// is made and the stale rates are returned without error. (spec 03 §2)
func TestFetchCurrencies_StaleServedOnRefetchFailure(t *testing.T) {
	srv, hits := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	s := NewCurrencyService(srv.URL, testFiatKey)

	now := time.Now().Unix()
	seeded := &models.ExchangeRates{Base: "USD", Rates: map[string]float64{"EUR": 0.7}}
	s.cache.Set("fiat_rates_USD", &CachedRates{
		Rates:          seeded,
		LastUpdateUnix: now - 25*60*60, // stale
		FetchedAtUnix:  now - 20*60,    // 20 min ago -> cooldown expired
	}, cache.NoExpiration)

	rates, err := s.FetchCurrencies("USD")
	if err != nil {
		t.Fatalf("expected stale rates without error, got err: %v", err)
	}
	if rates.Rates["EUR"] != 0.7 {
		t.Fatalf("expected stale rates served, got %+v", rates)
	}
	if got := atomic.LoadInt32(hits); got != 1 {
		t.Fatalf("expected exactly 1 upstream attempt, got %d", got)
	}
}

// A cache entry of the wrong type must behave as a miss, not panic. (spec 03 §4)
func TestFetchCurrencies_PoisonedCacheDoesNotPanic(t *testing.T) {
	now := time.Now().Unix()
	srv, hits := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, fiatSuccessBody(now))
	})

	s := NewCurrencyService(srv.URL, testFiatKey)
	s.cache.Set("fiat_rates_USD", "not-a-CachedRates", cache.NoExpiration)

	rates, err := s.FetchCurrencies("USD")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rates.Base != "USD" {
		t.Fatalf("expected a fresh fetch after poisoned cache, got %+v", rates)
	}
	if got := atomic.LoadInt32(hits); got != 1 {
		t.Fatalf("expected 1 upstream hit after poisoned cache, got %d", got)
	}
}

// 10 concurrent cold-cache calls collapse into a single upstream call. (spec 03 §3)
func TestFetchCurrencies_SingleflightCoalesces(t *testing.T) {
	now := time.Now().Unix()
	srv, hits := newFiatServer(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond) // hold the flight open so callers overlap
		fmt.Fprint(w, fiatSuccessBody(now))
	})

	s := NewCurrencyService(srv.URL, testFiatKey)

	const n = 10
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, err := s.FetchCurrencies("USD")
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
