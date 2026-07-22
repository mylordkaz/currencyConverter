package api

import (
	"errors"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)

// baseCodeRe matches a normalized ISO-4217-style currency code (three letters).
var baseCodeRe = regexp.MustCompile(`^[A-Z]{3}$`)

type Handler struct {
	currencyService *service.CurrencyService
	cryptoService   *service.CryptoService
}

func NewHandler(currencyService *service.CurrencyService, cryptoService *service.CryptoService) *Handler {
	return &Handler{
		currencyService: currencyService,
		cryptoService:   cryptoService,
	}
}

// Healthz is a lightweight liveness endpoint used by the Docker healthcheck.
func (h *Handler) Healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) GetCurrencies(c *gin.Context) {
	base := strings.ToUpper(strings.TrimSpace(c.DefaultQuery("base", "USD")))
	if !baseCodeRe.MatchString(base) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid base currency code"})
		return
	}

	rates, err := h.currencyService.FetchCurrencies(base)
	if err != nil {
		log.Printf("fiat fetch failed (base=%s): %v", base, err)
		respondError(c, err, "exchange rate provider unavailable")
		return
	}
	c.JSON(http.StatusOK, rates)
}

func (h *Handler) GetCrypto(c *gin.Context) {
	crypto, err := h.cryptoService.FetchCrypto()
	if err != nil {
		log.Printf("crypto fetch failed: %v", err)
		respondError(c, err, "crypto rate provider unavailable")
		return
	}
	c.JSON(http.StatusOK, crypto)
}

// respondError maps a service error to a client-safe response. Upstream
// failures become a 502 with the supplied generic message; everything else is a
// generic 500. Internal error text (which may embed URLs or keys) is never sent
// to the client.
func respondError(c *gin.Context, err error, upstreamMsg string) {
	if errors.Is(err, service.ErrUpstream) {
		c.JSON(http.StatusBadGateway, gin.H{"error": upstreamMsg})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
}
