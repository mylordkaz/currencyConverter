package main

import (
	"log"

	"github.com/mylordkaz/currencyConverter/backend/config"
)


func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}
}