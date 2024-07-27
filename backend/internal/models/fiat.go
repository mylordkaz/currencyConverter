package models


type ExchangeRates struct {
	Base 	string 				`json:"base"`
	Date 	string				`json:"date"`
	Rates 	map[string]float64	`json:"rates"`
}