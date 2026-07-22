package service

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/mylordkaz/currencyConverter/backend/internal/models"
	"github.com/mylordkaz/currencyConverter/backend/pkg/utils"
	"github.com/patrickmn/go-cache"
	"golang.org/x/sync/singleflight"
)

const (
	// freshWindow: how long the provider's own data is considered fresh.
	freshWindow = 24 * time.Hour
	// fetchCooldown: after we fetch, don't hit the upstream again for this
	// long even if the provider's data still looks stale. Stops the
	// stale-data stampede while the provider hasn't published a new update.
	fetchCooldown = 15 * time.Minute
)

type CurrencyService struct {
	baseURL string
	apiKey  string
	client  *http.Client
	cache   *cache.Cache
	sf      singleflight.Group
}

type CachedRates struct {
	Rates          *models.ExchangeRates
	LastUpdateUnix int64
	// FetchedAtUnix records when *we* fetched the data (not the provider's
	// own update time), enabling the refetch cooldown.
	FetchedAtUnix int64
}

func NewCurrencyService(baseURL, apiKey string) *CurrencyService {
	return &CurrencyService{
		baseURL: baseURL,
		apiKey:  apiKey,
		client:  utils.NewHTTPClient(),
		cache:   cache.New(15*time.Minute, 30*time.Minute),
	}
}

func (s *CurrencyService) FetchCurrencies(base string) (*models.ExchangeRates, error) {
	cacheKey := fmt.Sprintf("fiat_rates_%s", base)

	if rates, ok := s.freshFromCache(cacheKey); ok {
		return rates, nil
	}

	// Coalesce concurrent misses so only one goroutine hits the paid upstream.
	result, err, _ := s.sf.Do(cacheKey, func() (any, error) {
		// Re-check inside the flight: another batch may have refreshed the
		// cache while we were queued.
		if rates, ok := s.freshFromCache(cacheKey); ok {
			return rates, nil
		}
		return s.fetchAndCache(cacheKey, base)
	})
	if err != nil {
		return nil, err
	}
	return result.(*models.ExchangeRates), nil
}

// freshFromCache returns the cached rates when they are still serveable: the
// provider's data is fresh, OR we fetched recently (cooldown). A poisoned entry
// of the wrong type is treated as a miss rather than panicking.
func (s *CurrencyService) freshFromCache(cacheKey string) (*models.ExchangeRates, bool) {
	cached, found := s.cache.Get(cacheKey)
	if !found {
		return nil, false
	}
	cachedData, ok := cached.(*CachedRates)
	if !ok {
		return nil, false
	}
	now := time.Now().Unix()
	if now-cachedData.LastUpdateUnix < int64(freshWindow.Seconds()) ||
		now-cachedData.FetchedAtUnix < int64(fetchCooldown.Seconds()) {
		return cachedData.Rates, true
	}
	return nil, false
}

// fetchAndCache performs the upstream call and stores the result. On failure it
// falls back to any cached (stale) rates rather than erroring out; the error is
// only propagated when there is nothing cached to serve.
func (s *CurrencyService) fetchAndCache(cacheKey, base string) (*models.ExchangeRates, error) {
	fetched, err := s.fetchFromUpstream(base)
	if err != nil {
		if cached, found := s.cache.Get(cacheKey); found {
			if cachedData, ok := cached.(*CachedRates); ok {
				log.Printf("fiat upstream refetch failed, serving stale rates: %v", err)
				return cachedData.Rates, nil
			}
		}
		return nil, err
	}

	fetched.FetchedAtUnix = time.Now().Unix()
	s.cache.Set(cacheKey, fetched, cache.NoExpiration)
	return fetched.Rates, nil
}

func (s *CurrencyService) fetchFromUpstream(base string) (*CachedRates, error) {
	// The API key lives in the URL path, so any error carrying the URL must be
	// redacted before it travels up the chain.
	url := fmt.Sprintf("%s/v6/%s/latest/%s", s.baseURL, s.apiKey, base)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, redact(err.Error(), s.apiKey))
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, redact(err.Error(), s.apiKey))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: provider returned status %d", ErrUpstream, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, redact(err.Error(), s.apiKey))
	}

	var apiResponse struct {
		Result             string             `json:"result"`
		Base               string             `json:"base_code"`
		Rates              map[string]float64 `json:"conversion_rates"`
		TimeLastUpdateUnix int64              `json:"time_last_update_unix"`
	}
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, redact(err.Error(), s.apiKey))
	}

	if apiResponse.Result != "success" {
		return nil, fmt.Errorf("%w: provider returned result %q", ErrUpstream, apiResponse.Result)
	}

	return &CachedRates{
		Rates: &models.ExchangeRates{
			Base:  apiResponse.Base,
			Rates: apiResponse.Rates,
		},
		LastUpdateUnix: apiResponse.TimeLastUpdateUnix,
	}, nil
}
