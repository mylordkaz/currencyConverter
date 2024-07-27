package service

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/mylordkaz/currencyConverter/backend/internal/models"
	"github.com/mylordkaz/currencyConverter/backend/pkg/utils"
)


type CryptoService struct {
	apiURL  string
	apiKey	string
	client 	*http.Client
}

func NewCryptoService(apiURL, apiKey string) *CryptoService {
	return &CryptoService{
		apiURL: apiURL,
		apiKey: apiKey,
		client: utils.NewHTTPClient(),
	}
}

func (s *CryptoService) FetchCrypto() (*models.CryptoRates, error) {
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

	return &cryptoResponse.Data, nil
}