package models

type ExchangeRates struct {
	Base  string             `json:"base"`
	Rates map[string]float64 `json:"rates"`
}
