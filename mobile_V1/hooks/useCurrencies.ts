import axios from 'axios';
// import { API_URL } from '@env';
import { useEffect, useState, useTransition } from 'react';
import { Currency } from '@/constants/type';

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
  const [isPending, startTransition] = useTransition();

  const fetchCrypto = async () => {
    try {
      console.log('Fetching crypto currencies from:', `${API_URL}api/crypto`);
      const response = await axios.get(`${API_URL}api/crypto`);
      console.log('Crypto data:', response.data);
      const cryptos: Currency[] = response.data.map((crypto: any) => ({
        code: crypto.symbol,
        name: crypto.name,
        flag: `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`,
        rate: crypto.quote.USD.price,
        symbol: crypto.symbol,
        type: 'crypto',
      }));
      startTransition(() => {
        setCryptoCurrencies(cryptos);
      });
    } catch (error) {
      console.error('Error fetching crypto currencies', error);
      setError('Failed to fetch crypto currencies');
    }
  };
  const fetchFiat = async () => {
    try {
      console.log(
        'Fetching fiat currencies from:',
        `${API_URL}api/fiat?base=USD`
      );
      const response = await axios.get(`${API_URL}api/fiat?base=USD`);
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
      startTransition(() => {
        setFiatCurrencies(fiats);
      });
    } catch (error) {
      console.error('Error fetching fiats', error);
      setError('Failed to fetch fiat currencies');
      if (axios.isAxiosError(error)) {
        console.error('Request config:', error.config);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const cryptoPromise = fetchCrypto().catch((error) => {
          console.error('Crypto fetch error:', error);
          return null;
        });
        const fiatPromise = fetchFiat().catch((error) => {
          console.error('Fiat fetch error:', error);
          return null;
        });

        await Promise.all([cryptoPromise, fiatPromise]);
      } catch (error) {
        console.error('Error fetching data', error);
        setError('Failed to fetch currency data');
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    fetchData();
  }, []);
  return { cryptoCurrencies, fiatCurrencies, isLoading, error };
};

export default useCurrencies;
