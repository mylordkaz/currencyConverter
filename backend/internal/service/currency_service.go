package service

import (
	"strings"
	"sync"
	"time"

	"github.com/mylordkaz/currencyConverter/backend/internal/models"
)


type CurrencyService struct {
	fiatCurrencies 		map[string]models.Currency
	cryptoCurrencies 	map[string]models.Currency
	mutex 				sync.RWMutex
	updateInvertval		time.Duration
}

func NewCurrencyService() *CurrencyService {
	cs := &CurrencyService{
		fiatCurrencies: make(map[string]models.Currency),
		cryptoCurrencies: make(map[string]models.Currency),
		updateInvertval: 24 * time.Hour,
	}
	go cs.periodcUpdate()
	return cs
}

func (cs *CurrencyService) periodcUpdate() {
	for {
		
	}
}

