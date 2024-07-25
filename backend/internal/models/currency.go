package models

type CurrencyType string

const (
	Fiat CurrencyType = "fiat"
	Crypto CurrencyType = "crypto"
)

type Currency struct {
	Code string
	Name string
	Type CurrencyType
}

type ExchangeRates struct {
	Base 	string 				`json:"base"`
	Date 	string				`json:"date"`
	Rates 	map[string]float64	`json:"rates"`
}