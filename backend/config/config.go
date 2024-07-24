package config

import (
	"fmt"
	"os"
)

type Config struct {
	FiatAPIURL 		string
	CryptoAPIURL	string
}

func Load() (*Config, error) {
	fiatAPIURL := os.Getenv("FIAT_API_URL")
	if fiatAPIURL == "" {
		return nil, fmt.Errorf("FIAT_API_URL env is not set")
	}
	cryptoAPIURL := os.Getenv("CRYPTO_API_URL")
	if cryptoAPIURL == ""{
		return nil, fmt.Errorf("CRYPTO_API_URL env is not set")
	}

	return &Config{
		FiatAPIURL: fiatAPIURL,
		CryptoAPIURL: cryptoAPIURL,
	}, nil
}