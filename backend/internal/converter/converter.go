package converter

import "github.com/mylordkaz/currencyConverter/backend/pkg/utils/exchangerates"

type Converter struct {
	rateClient *exchangerates.Client
}

func NewConverter(client *exchangerates.Client) *Converter {
	return &Converter{rateClient: client}
}

func (c *Converter) Convert(amount float64, from, to string) (float64, error) {
	rate, err := c.rateClient.GetExchangeRate(from, to)
	if err != nil {
		return 0, err
	}
	return amount * rate, nil
}