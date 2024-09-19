package models


type CryptoResponse struct {
	Data []CryptoCurrency `json:"data"`
}

type CryptoCurrency struct {
	ID 		int			`json:"id"`
	Name 	string		`json:"name"`
	Symbol	string		`json:"symbol"`
	Quote 	Quote		`json:"quote"`
}

type Quote struct {
	USD 	PriceInfo	`json:"USD"`
}

type PriceInfo struct {
	Price 				float64		`json:"price"`
	PercentChange24H	float64		`json:"percent_change_24h"`
}