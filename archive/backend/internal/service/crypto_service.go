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

const cryptoCacheKey = "crypto_rates"

type CryptoService struct {
	apiURL string
	apiKey string
	client *http.Client
	cache  *cache.Cache
	sf     singleflight.Group
}

func NewCryptoService(apiURL, apiKey string) *CryptoService {
	return &CryptoService{
		apiURL: apiURL,
		apiKey: apiKey,
		client: utils.NewHTTPClient(),
		cache:  cache.New(5*time.Minute, 10*time.Minute),
	}
}

func (s *CryptoService) FetchCrypto() ([]models.CryptoCurrency, error) {
	if data, ok := s.fromCache(); ok {
		return data, nil
	}

	// Coalesce concurrent misses into a single upstream call.
	result, err, _ := s.sf.Do(cryptoCacheKey, func() (any, error) {
		if data, ok := s.fromCache(); ok {
			return data, nil
		}

		data, err := s.fetchFromUpstream()
		if err != nil {
			// Serve stale-but-present data on failure rather than erroring.
			if stale, ok := s.fromCache(); ok {
				log.Printf("crypto upstream refetch failed, serving cached rates: %v", err)
				return stale, nil
			}
			return nil, err
		}

		s.cache.Set(cryptoCacheKey, data, cache.DefaultExpiration)
		return data, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]models.CryptoCurrency), nil
}

// fromCache returns cached crypto rates, treating a wrong-typed (poisoned)
// entry as a miss instead of panicking.
func (s *CryptoService) fromCache() ([]models.CryptoCurrency, bool) {
	cached, found := s.cache.Get(cryptoCacheKey)
	if !found {
		return nil, false
	}
	data, ok := cached.([]models.CryptoCurrency)
	if !ok {
		return nil, false
	}
	return data, true
}

func (s *CryptoService) fetchFromUpstream() ([]models.CryptoCurrency, error) {
	url := fmt.Sprintf("%s/v1/cryptocurrency/listings/latest", s.apiURL)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, redact(err.Error(), s.apiKey))
	}
	// Key travels in a header, so it's unlikely to surface in an error, but we
	// redact defensively and cheaply anyway.
	req.Header.Set("X-CMC_PRO_API_KEY", s.apiKey)

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

	var cryptoResponse models.CryptoResponse
	if err := json.Unmarshal(body, &cryptoResponse); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUpstream, redact(err.Error(), s.apiKey))
	}

	return cryptoResponse.Data, nil
}
