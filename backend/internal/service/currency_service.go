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


type CurrencyService struct {
	baseURL 	string
	apiKey 		string
	client 		*http.Client
	cache 		*cache.Cache

}

func NewCurrencyService(baseURL, apiKey string) *CurrencyService {
	return &CurrencyService{
		baseURL: baseURL,
		apiKey: apiKey,
		client: utils.NewHTTPClient(),
		cache: cache.New(15*time.Minute, 30*time.Minute),
	}
}


func (s *CurrencyService) FetchCurrencies(base string) (*models.ExchangeRates, error) {
	cacheKey := fmt.Sprintf("fiat_rates_%s", base)

	// check cache
	if cached, found := s.cache.Get(cacheKey); found {
		return cached.(*models.ExchangeRates), nil
	}

	// if not in cache fetch from API
	url := fmt.Sprintf("%s/v6/%s/latest/%s", s.baseURL, s.apiKey, base)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status code: %d", resp.StatusCode)
	}

	var apiResponse struct {
		Result 	string 				`json:"result"`
		Base 	string 				`json:"base_code"`
		Rates 	map[string]float64	`json:"conversion_rates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	if apiResponse.Result != "success" {
		return nil, fmt.Errorf("API returned non-success result: %s", apiResponse.Result)
	}

	rates := &models.ExchangeRates{
		Base: apiResponse.Base,
		Rates: apiResponse.Rates,
	}

	// cache the result 
	s.cache.Set(cacheKey, rates, cache.DefaultExpiration)

	return rates, nil 
}