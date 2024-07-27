package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)


type Handler struct {
	currencyService *service.CurrencyService
}

func NewHandler(currencyService *service.CurrencyService) *Handler {
	return &Handler{currencyService: currencyService}
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
