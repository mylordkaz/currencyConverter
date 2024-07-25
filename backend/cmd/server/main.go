package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mylordkaz/currencyConverter/backend/config"
	"github.com/mylordkaz/currencyConverter/backend/internal/api"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)


func main() {

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	currencyService := service.NewCurrencyService(cfg.FiatAPIURL, cfg.FiatAPIKEY)
	handler := api.NewHandler(currencyService)

	r := gin.Default()
	r.GET("/api/currencies", handler.GetCurrencies)

	log.Printf("Starting server on %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Failed to start server %s", err)
	}
}
