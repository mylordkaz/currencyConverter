package service

import (
	"net/http"

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

