package config

import (
	"fmt"
	"os"
)

type Config struct {
	FiatAPIURL   string
	FiatAPIKEY   string
	CryptoAPIURL string
	CryptoAPIKEY string
	FrontURL     string
	Port         string
}

func Load() (*Config, error) {
	fiatAPIURL := os.Getenv("FIAT_API_URL")
	fiatAPIKEY := os.Getenv("FIAT_API_KEY")
	if fiatAPIKEY == "" {
		return nil, fmt.Errorf("FIAT_API_KEY env is not set")
	}
	cryptoAPIURL := os.Getenv("CRYPTO_API_URL")
	cryptoAPIKEY := os.Getenv("CRYPTO_API_KEY")
	if cryptoAPIKEY == "" {
		return nil, fmt.Errorf("CRYPTO_API_KEY env is not set")
	}

	return &Config{
		FiatAPIURL:   fiatAPIURL,
		FiatAPIKEY:   fiatAPIKEY,
		CryptoAPIURL: cryptoAPIURL,
		CryptoAPIKEY: cryptoAPIKEY,
		// FRONT_URL is an optional, comma-separated allow-list of browser
		// origins for CORS. Defaults to the Vite dev server when unset.
		FrontURL: getEnvDefault("FRONT_URL", "http://localhost:5173"),
		Port:     getEnvDefault("PORT", "8080"),
	}, nil
}

func getEnvDefault(key, defaultValue string) string {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}
	return value
}
