package main

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/mylordkaz/currencyConverter/backend/config"
	
)


func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}
}
