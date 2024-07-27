package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)


type Handler struct {
	currencyService *service.CurrencyService
	cryptoService 	*service.CryptoService
}

func NewHandler(currencyService *service.CurrencyService, cryptoService *service.CryptoService) *Handler {
	return &Handler{
		currencyService: currencyService,
		cryptoService: cryptoService,
	}
}

func (h *Handler) GetCurrencies(c *gin.Context) {
	base := c.DefaultQuery("base", "USD")

	currencies, err := h.currencyService.FetchCurrencies(base)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, currencies)
}

func (h *Handler) GetCrypto(c *gin.Context) {
	crypto, err := h.cryptoService.FetchCrypto()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, crypto )
}
