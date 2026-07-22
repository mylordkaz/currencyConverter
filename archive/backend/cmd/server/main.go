package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/mylordkaz/currencyConverter/backend/config"
	"github.com/mylordkaz/currencyConverter/backend/internal/api"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)

func main() {
	// "/server -healthcheck" hits our own /healthz and exits 0/1. Lets the
	// distroless container (no shell, curl or wget) run a real healthcheck.
	if len(os.Args) > 1 && os.Args[1] == "-healthcheck" {
		os.Exit(runHealthcheck())
	}

	if err := godotenv.Load(); err != nil {
		log.Println("no .env file loaded (continuing with process environment)")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// Default to release mode; honour an explicit GIN_MODE when provided.
	if _, set := os.LookupEnv("GIN_MODE"); !set {
		gin.SetMode(gin.ReleaseMode)
	}

	currencyService := service.NewCurrencyService(cfg.FiatAPIURL, cfg.FiatAPIKEY)
	cryptoService := service.NewCryptoService(cfg.CryptoAPIURL, cfg.CryptoAPIKEY)
	handler := api.NewHandler(currencyService, cryptoService)

	// gin.New() + explicit middleware == gin.Default(), but intentional.
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	corsCfg := cors.DefaultConfig()
	corsCfg.AllowOrigins = splitAndTrim(cfg.FrontURL)
	corsCfg.AllowMethods = []string{http.MethodGet}
	r.Use(cors.New(corsCfg))

	r.GET("/healthz", handler.Healthz)
	r.GET("/api/fiat", handler.GetCurrencies)
	r.GET("/api/crypto", handler.GetCrypto)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second, // > upstream client timeout (10s) + margin
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("starting server on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	stop() // restore default signal handling so a second signal force-quits
	log.Println("shutdown signal received, draining connections...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped cleanly")
}

// runHealthcheck probes the local /healthz endpoint and returns a process exit
// code (0 healthy, 1 unhealthy).
func runHealthcheck() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

// splitAndTrim parses a comma-separated origins list into a clean slice,
// dropping empty entries and surrounding whitespace.
func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
