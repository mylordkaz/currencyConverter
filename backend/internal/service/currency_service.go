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


func (s *CurrencyService) FetchCurrencies() (*models.ExchangeRates, error) {
	url := fmt.Sprintf("%s/USD", s.baseURL)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("Error creating request: %w", err)
	}
	if s.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+s.apiKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status code: %d", resp.StatusCode)
	}

	var rates models.ExchangeRates
	if err := json.NewDecoder(resp.Body).Decode(&rates); err != nil {
		return nil, fmt.Errorf("error decoding response %w", err)
	}

	return &rates, nil 
}