package service

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/mylordkaz/currencyConverter/backend/internal/models"
	"github.com/mylordkaz/currencyConverter/backend/pkg/utils"
)


type CurrencyService struct {
	baseURL 	string
	apiKey 		string
	client 		*http.Client

}

func NewCurrencyService(baseURL, apiKey string) *CurrencyService {
	return &CurrencyService{
		baseURL: baseURL,
		apiKey: apiKey,
		client: utils.NewHTTPClient(),
	}
}


func (s *CurrencyService) FetchCurrencies(base string) (*models.ExchangeRates, error) {
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

	return rates, nil 
}