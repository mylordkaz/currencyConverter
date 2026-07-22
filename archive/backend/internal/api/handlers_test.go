package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

// newRouter wires the same routes as main.go against the supplied handler.
func newRouter(h *Handler) *gin.Engine {
	r := gin.New()
	r.GET("/healthz", h.Healthz)
	r.GET("/api/fiat", h.GetCurrencies)
	r.GET("/api/crypto", h.GetCrypto)
	return r
}

// newFiatUpstream returns a fake ExchangeRate-API server that records the base
// currency segment of the request path and counts hits.
func newFiatUpstream(t *testing.T) (*httptest.Server, *int32, *atomic.Value) {
	t.Helper()
	var hits int32
	var lastBase atomic.Value
	lastBase.Store("")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		if seg := r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]; seg != "" {
			lastBase.Store(seg)
		}
		fmt.Fprint(w, `{"result":"success","base_code":"USD","conversion_rates":{"USD":1,"EUR":0.9},"time_last_update_unix":`+
			fmt.Sprint(time.Now().Unix())+`}`)
	}))
	t.Cleanup(srv.Close)
	return srv, &hits, &lastBase
}

func TestGetCurrencies_BaseNormalized(t *testing.T) {
	srv, hits, lastBase := newFiatUpstream(t)
	h := NewHandler(service.NewCurrencyService(srv.URL, "k"), service.NewCryptoService(srv.URL, "k"))
	r := newRouter(h)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/fiat?base=usd", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	if got := lastBase.Load().(string); got != "USD" {
		t.Fatalf("expected upstream to receive normalized base USD, got %q", got)
	}
	if atomic.LoadInt32(hits) != 1 {
		t.Fatalf("expected exactly 1 upstream hit, got %d", atomic.LoadInt32(hits))
	}
}

func TestGetCurrencies_InvalidBaseRejected(t *testing.T) {
	cases := []string{"USD/../x", "TOOLONG", "DOLLARS", "U$", "12", "US"}
	for _, base := range cases {
		t.Run(base, func(t *testing.T) {
			srv, hits, _ := newFiatUpstream(t)
			h := NewHandler(service.NewCurrencyService(srv.URL, "k"), service.NewCryptoService(srv.URL, "k"))
			r := newRouter(h)

			w := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/api/fiat?base="+url.QueryEscape(base), nil)
			r.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Fatalf("base=%q: expected 400, got %d (body=%s)", base, w.Code, w.Body.String())
			}
			if got := atomic.LoadInt32(hits); got != 0 {
				t.Fatalf("base=%q: expected 0 upstream hits, got %d", base, got)
			}
		})
	}
}

// Security regression (spec 02): a failing upstream whose URL embeds the API key
// must never leak the key or the upstream host to the client. The response is a
// generic 502.
func TestGetCurrencies_UpstreamFailureDoesNotLeakKeyOrHost(t *testing.T) {
	const fakeKey = "SUPERSECRETKEY-9f8e7d6c5b4a"

	// Start then immediately close a server so connections are refused fast.
	dead := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	deadURL := dead.URL
	dead.Close()
	host := mustHost(t, deadURL)

	h := NewHandler(service.NewCurrencyService(deadURL, fakeKey), service.NewCryptoService(deadURL, "k"))
	r := newRouter(h)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/fiat?base=USD", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 on upstream failure, got %d", w.Code)
	}
	body := w.Body.String()
	if strings.Contains(body, fakeKey) {
		t.Fatalf("response body leaked the API key: %s", body)
	}
	if strings.Contains(body, host) {
		t.Fatalf("response body leaked the upstream host %q: %s", host, body)
	}
	if !strings.Contains(body, "exchange rate provider unavailable") {
		t.Fatalf("expected generic upstream message, got: %s", body)
	}
}

func TestHealthz(t *testing.T) {
	h := NewHandler(service.NewCurrencyService("http://unused", "k"), service.NewCryptoService("http://unused", "k"))
	r := newRouter(h)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if body := strings.TrimSpace(w.Body.String()); body != `{"status":"ok"}` {
		t.Fatalf("unexpected healthz body: %s", body)
	}
}

func mustHost(t *testing.T, raw string) string {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("failed to parse test URL %q: %v", raw, err)
	}
	return u.Host
}
