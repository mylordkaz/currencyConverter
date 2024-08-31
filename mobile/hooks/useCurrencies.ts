import axios from 'axios';
import { useEffect, useState } from 'react';

interface Currency {
  code: string;
  name: string;
  flag: string;
  rate: number;
  symbol: string;
  type: 'crypto' | 'fiat';
}

const apiURL = '';

const currencyInfo: Record<string, { name: string; symbol: string }> = {
  USD: { name: 'United States Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  GBP: { name: 'British Pound', symbol: '£' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  // Add more currencies as needed
};
const currencyCodes = Object.keys(currencyInfo);

const getFlagEmoji = (countryCode: string) => {
  const codePoints = countryCode
    .slice(0, 2)
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const useCurrencies = () => {
  const [cryptoCurrencies, setCryptoCurrencies] = useState<Currency[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCrypto = async () => {
    try {
      const response = await axios.get(`${apiURL}api/crypto`);
      const cryptos: Currency[] = response.data.map((crypto: any) => ({
        code: crypto.symbol,
        name: crypto.name,
        flag: `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`,
        rate: crypto.quote.USD.price,
        symbol: crypto.symbol,
        type: 'crypto',
      }));
      setCryptoCurrencies(cryptos);
    } catch (error) {
      console.error('Error fetching crypto currencies', error);
      setError('Failed to fetch crypto currencies');
    }
  };
  const fetchFiat = async () => {
    try {
      const response = await axios.get(`${apiURL}api/fiat?base=USD`);
      const rates = response.data.rates;
      const fiats: Currency[] = currencyCodes
        .filter((code) => code in rates)
        .map((code) => {
          return {
            code,
            name: currencyInfo[code].name,
            flag: getFlagEmoji(code),
            rate: rates[code],
            symbol: currencyInfo[code].symbol,
            type: 'fiat',
          };
        });
      setFiatCurrencies(fiats);
    } catch (error) {
      console.error('Error fetching fiats', error);
      setError('Failed to fetch fiat currencies');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchCrypto(), fetchFiat()]);
      } catch (error) {
        console.error('Error fetching data', error);
        setError('Failed to fetch currency data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  return { cryptoCurrencies, fiatCurrencies, isLoading, error };
};

export default useCurrencies;
