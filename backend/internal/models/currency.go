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