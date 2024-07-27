package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/mylordkaz/currencyConverter/backend/config"
	"github.com/mylordkaz/currencyConverter/backend/internal/api"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)


func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}
	

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	currencyService := service.NewCurrencyService(cfg.FiatAPIURL, cfg.FiatAPIKEY)
	cryptoService := service.NewCryptoService(cfg.CryptoAPIURL, cfg.CryptoAPIKEY)
	handler := api.NewHandler(currencyService, cryptoService)

	r := gin.Default()
	r.GET("/api/fiat", handler.GetCurrencies)
	r.GET("/api/crypto", handler.GetCrypto)

	log.Printf("Starting server on %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Failed to start server %s", err)
	}
}
