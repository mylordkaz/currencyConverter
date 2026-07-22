import axios from 'axios';
import { useEffect, useState, type ChangeEvent } from 'react';
import CurrencyDropdown from './components/CurrencyDropdown';
import { currencyCodes, currencyInfo } from './service/currencyInfo';
import CurrencySelectionModal from './components/CurrencySelectionModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  type Currency,
  convertCurrency,
  getDescription,
  getFlagEmoji,
  formatAmount,
} from './lib/currency';

const apiURL = import.meta.env.VITE_API_URL as string | undefined;

// Join the configured base URL with a path, tolerating a trailing slash (or
// none) on VITE_API_URL. Fails loud if the env var is missing.
function buildUrl(path: string): string {
  if (!apiURL) {
    console.error(
      'VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env.'
    );
    return path;
  }
  const base = apiURL.replace(/\/+$/, '');
  const suffix = path.replace(/^\/+/, '');
  return `${base}/${suffix}`;
}

interface FiatResponse {
  base: string;
  updatedAt: string | null;
  rates: Record<string, number>;
}

interface CryptoApiItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  iconUrl: string;
}

async function fetchFiatCurrencies(): Promise<Currency[]> {
  const response = await axios.get<FiatResponse>(buildUrl('/api/fiat'), {
    params: { base: 'USD' },
  });
  const rates = response.data.rates;

  return currencyCodes
    .filter((code) => code in rates)
    .map(
      (code): Currency => ({
        id: `fiat-${code}`,
        code,
        name: currencyInfo[code].name,
        flag: getFlagEmoji(code, currencyInfo[code].flag),
        rate: rates[code],
        symbol: currencyInfo[code].symbol,
        type: 'fiat',
      })
    );
}

async function fetchCryptoCurrencies(): Promise<Currency[]> {
  const response = await axios.get<CryptoApiItem[]>(buildUrl('/api/crypto'));

  // The worker already returns unique symbols (top 100 by rank, deduped), but
  // keep this client-side dedupe as defense-in-depth so code-based user
  // selections stay unambiguous. First occurrence (lowest rank) wins.
  const seen = new Set<string>();
  const cryptos: Currency[] = [];
  for (const crypto of response.data) {
    if (seen.has(crypto.symbol)) {
      continue;
    }
    seen.add(crypto.symbol);
    cryptos.push({
      id: `crypto-${crypto.id}`,
      code: crypto.symbol,
      name: crypto.name,
      flag: crypto.iconUrl,
      rate: crypto.price,
      symbol: crypto.symbol,
      type: 'crypto',
    });
  }
  return cryptos;
}

export default function App() {
  const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
  const [cryptoCurrencies, setCryptoCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>(
    () => localStorage.getItem('baseCurrency') || 'USD'
  );
  const [amount, setAmount] = useState<string>(
    () => localStorage.getItem('amount') || ''
  );
  const [currencyList, setCurrencyList] = useState<string[]>(() => {
    const savedList = localStorage.getItem('currencyList');
    return savedList ? (JSON.parse(savedList) as string[]) : [];
  });

  const allCurrencies = [...fiatCurrencies, ...cryptoCurrencies];
  const baseCurrencyObj = allCurrencies.find((c) => c.code === baseCurrency);

  // Conversion is fully client-side and both endpoints are USD-based, so fetch
  // exactly once on mount (not on every base-currency change).
  useEffect(() => {
    let active = true;
    fetchFiatCurrencies()
      .then((fiats) => {
        if (active) setFiatCurrencies(fiats);
      })
      .catch((error) => {
        console.error('Error fetching currencies', error);
      });
    fetchCryptoCurrencies()
      .then((cryptos) => {
        if (active) setCryptoCurrencies(cryptos);
      })
      .catch((error) => {
        console.error('Error fetching cryptocurrencies', error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('currencyList', JSON.stringify(currencyList));
  }, [currencyList]);

  useEffect(() => {
    localStorage.setItem('baseCurrency', baseCurrency);
  }, [baseCurrency]);

  useEffect(() => {
    localStorage.setItem('amount', amount);
  }, [amount]);

  const handleBaseCurrencyChange = (currency: string) => {
    setBaseCurrency(currency);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits and a single decimal separator; reject other input.
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleCurrenciesList = (currencyCode: string) => {
    setCurrencyList((prev) =>
      prev.includes(currencyCode)
        ? prev.filter((code) => code !== currencyCode)
        : [...prev, currencyCode]
    );
  };

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(currencyList);
    const [reorderItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderItem);
    setCurrencyList(items);
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <div className=" min-h-screen bg-linear-to-b from-blue-400 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-8 text-center text-black">
            Tsukakan
          </h1>

          <div className="space-y-4">
            <CurrencyDropdown
              currencies={allCurrencies}
              selectedCurrency={baseCurrency}
              onSelect={handleBaseCurrencyChange}
            />

            <div className="bg-slate-400 rounded-3xl p-4 flex items-center justify-between">
              <div className="flex items-center flex-grow">
                <span className="text-white text-3xl font-bold mr-2">
                  {baseCurrencyObj?.symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  className="bg-transparent text-white text-3xl font-bold focus:outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-md bg-white rounded-3xl shadow-lg mt-6 p-6">
            <h1 className="text-2xl font-bold mb-4">My Currencies</h1>

            <Droppable droppableId="currency">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {currencyList.map((currencyCode, index) => {
                    const currency = allCurrencies.find(
                      (c) => c.code === currencyCode
                    );
                    const draggableId = currency
                      ? currency.id
                      : `missing-${currencyCode}`;
                    const converted =
                      currency && baseCurrencyObj
                        ? convertCurrency(
                            parseFloat(amount) || 0,
                            baseCurrencyObj,
                            currency
                          )
                        : null;

                    return (
                      <Draggable
                        key={draggableId}
                        draggableId={draggableId}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
                          >
                            {currency && baseCurrencyObj ? (
                              <>
                                <div className="flex items-center">
                                  {currency.type === 'crypto' ? (
                                    <img
                                      src={currency.flag}
                                      alt={currency.name}
                                      className="w-6 h-6 mr-2"
                                    />
                                  ) : (
                                    <span className="mr-2">
                                      {currency.flag}
                                    </span>
                                  )}
                                  <span className="font-semibold">
                                    {currency.code}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <div className="text-right">
                                    <div className="font-semibold">
                                      {converted !== null
                                        ? formatAmount(converted)
                                        : '0.00'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {getDescription(currency, baseCurrencyObj)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="ml-4 text-gray-400"
                                    aria-label={`Remove ${currency.code}`}
                                    onClick={() =>
                                      handleCurrenciesList(currencyCode)
                                    }
                                  >
                                    ⋮
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center">
                                  <span className="mr-2 text-gray-400">🏳️</span>
                                  <span className="font-semibold text-gray-500">
                                    {currencyCode}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-400">
                                      —
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      rate unavailable
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="ml-4 text-gray-400"
                                    aria-label={`Remove ${currencyCode}`}
                                    onClick={() =>
                                      handleCurrenciesList(currencyCode)
                                    }
                                  >
                                    ✕
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}

                  {currencyList.length === 0 && (
                    <div>
                      No currencies selected. Please add some currencies.
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <div className="mt-4 flex justify-end">
              <CurrencySelectionModal
                currencies={allCurrencies}
                selectedCurrency={currencyList}
                onCurrencySelected={handleCurrenciesList}
              />
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
