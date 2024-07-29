package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/mylordkaz/currencyConverter/backend/internal/models"
	"github.com/mylordkaz/currencyConverter/backend/pkg/utils"
	"github.com/patrickmn/go-cache"
)


type CryptoService struct {
	apiURL  string
	apiKey	string
	client 	*http.Client
	cache 	*cache.Cache
}

func NewCryptoService(apiURL, apiKey string) *CryptoService {
	return &CryptoService{
		apiURL: apiURL,
		apiKey: apiKey,
		client: utils.NewHTTPClient(),
		cache: cache.New(5*time.Minute, 10*time.Minute),
	}
}

func (s *CryptoService) FetchCrypto() ([]models.CryptoCurrency, error) {
	cacheKey := "crypto_rates"

	// check cache
	if cached, found := s.cache.Get(cacheKey); found {
		return cached.([]models.CryptoCurrency), nil
	}

	url := fmt.Sprintf("%s/v1/cryptocurrency/listings/latest", s.apiURL)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating the request %w", err)
	}

	req.Header.Set("X-CMC_PRO_API_KEY", s.apiKey)

	resp, err :=s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making the request %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status code: %d", resp.StatusCode)
	}

	var cryptoResponse models.CryptoResponse
	if err := json.NewDecoder(resp.Body).Decode(&cryptoResponse); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	// cache the result
	s.cache.Set(cacheKey, cryptoResponse.Data, cache.DefaultExpiration)

	return cryptoResponse.Data, nil
}