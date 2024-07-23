package config

import (
	"encoding/json"
	"os"
)

type Config struct {
	FiatAPIURL 		string `json:"fiatApiUrl"`
	CryptoAPIURL	string `json:"cryptoApiUrl"`
}

func Load() (*Config, error) {
	file, err := os.Open("config.json")
	if err != nil {
		return nil, err 
	}
	defer file.Close()

	var cfg Config
	err = json.NewDecoder(file).Decode(&cfg)
	if err != nil {
		return nil, err 
	}

	return &cfg, nil
}