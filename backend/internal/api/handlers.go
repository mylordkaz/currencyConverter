package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/mylordkaz/currencyConverter/backend/internal/service"
)


type Handler struct {
	converter *service.Converter
}

func NewHandler(converter *service.Converter) *Handler {
	return &Handler{converter: converter}
}

func (h *Handler) ConverterHandler(w http.ResponseWriter, r *http.Request) {
	amount, err := strconv.ParseFloat(r.URL.Query().Get("amount"), 64)
	if err != nil {
		http.Error(w, "Invalid amount", http.StatusBadRequest)
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	result, err := h.converter.Convert(amount , from, to)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]float64{"result": result})
}

