package config

import (
	"fmt"
	"os"
)

type Config struct {
	FiatAPIURL 		string
	FiatAPIKEY		string
	CryptoAPIURL	string
	CryptoAPIKEY	string
	FrontURL		string
	Port			string
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
	// frontURL := os.Getenv("FRONT_URL")
	// if frontURL == "" {
	// 	return nil, fmt.Errorf("frontend URL is not defined")
	// }

	return &Config{
		FiatAPIURL: fiatAPIURL,
		FiatAPIKEY: fiatAPIKEY,
		CryptoAPIURL: cryptoAPIURL,
		CryptoAPIKEY: cryptoAPIKEY,
		// FrontURL: frontURL,
		Port: getEnvDefault("PORT", "8080"),
	}, nil
}

func getEnvDefault(key, defaultValue string) string {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}
	return value
}