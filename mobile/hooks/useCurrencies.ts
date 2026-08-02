import axios from 'axios';
import { useEffect, useState } from 'react';
import { Currency } from '@/constants/type';
import { getFlagEmoji } from '@/lib/currency';
import { currencyCodes, currencyInfo } from '@/service/currencyInfo';

/** Join a base URL and path with exactly one slash, tolerant of trailing/leading slashes. */
const joinUrl = (base: string, path: string): string =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/** Shape of `GET /api/fiat` from the rates worker (codes UPPERCASE). */
interface FiatResponse {
  base: string;
  updatedAt: string | null;
  rates: Record<string, number>;
}

/** Shape of each item in `GET /api/crypto` from the rates worker. */
interface CryptoApiItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  iconUrl: string;
}

const useCurrencies = () => {
  const [cryptoCurrencies, setCryptoCurrencies] = useState<Currency[]>([]);
  const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fiatError, setFiatError] = useState<string | null>(null);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  // Source-data date ("YYYY-MM-DD") from the fiat feed; crypto shares the same source.
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;

    const fetchCrypto = async (base: string) => {
      const response = await axios.get<CryptoApiItem[]>(
        joinUrl(base, 'api/crypto')
      );
      // The worker already guarantees unique symbols; keep this client-side
      // dedupe guard so a ticker maps to exactly one row and code-based user
      // selections stay unambiguous.
      const seen = new Set<string>();
      const cryptos: Currency[] = response.data
        .map(
          (crypto): Currency => ({
            id: `crypto-${crypto.id}`,
            code: crypto.symbol,
            name: crypto.name,
            flag: crypto.iconUrl,
            rate: crypto.price,
            symbol: crypto.symbol,
            type: 'crypto',
          })
        )
        .filter((c) => {
          if (seen.has(c.code)) return false;
          seen.add(c.code);
          return true;
        });
      setCryptoCurrencies(cryptos);
    };

    const fetchFiat = async (base: string) => {
      const response = await axios.get<FiatResponse>(
        joinUrl(base, 'api/fiat?base=USD')
      );
      const rates = response.data.rates;
      const fiats: Currency[] = currencyCodes
        .filter((code) => code in rates)
        .map((code) => ({
          id: `fiat-${code}`,
          code,
          name: currencyInfo[code].name,
          flag: getFlagEmoji(code, currencyInfo[code].flag),
          rate: rates[code],
          symbol: currencyInfo[code].symbol,
          type: 'fiat' as const,
        }));
      setFiatCurrencies(fiats);
      setUpdatedAt(response.data.updatedAt ?? null);
    };

    const fetchData = async () => {
      if (!apiUrl) {
        const message =
          'EXPO_PUBLIC_API_URL is not set. Configure it in your .env file.';
        console.error(message);
        setFiatError(message);
        setCryptoError(message);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setFiatError(null);
      setCryptoError(null);

      // Independent sources: one failing must not blank the other.
      await Promise.all([
        fetchCrypto(apiUrl).catch((error) => {
          console.error('Error fetching crypto currencies', error);
          setCryptoError('Failed to fetch crypto currencies');
        }),
        fetchFiat(apiUrl).catch((error) => {
          console.error('Error fetching fiat currencies', error);
          setFiatError('Failed to fetch fiat currencies');
        }),
      ]);

      setIsLoading(false);
    };

    fetchData();
  }, []);

  return { cryptoCurrencies, fiatCurrencies, isLoading, fiatError, cryptoError, updatedAt };
};

export default useCurrencies;
