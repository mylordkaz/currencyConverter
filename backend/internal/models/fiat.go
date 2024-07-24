package models

type FiatRates struct {
	Rates map[string]float64 `json:"rates"`
}