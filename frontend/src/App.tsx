import axios from 'axios';
import { useEffect, useState, type ChangeEvent } from 'react';
import CurrencyDropdown from './components/CurrencyDropdown';
import CurrencyIcon from './components/CurrencyIcon';
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

  // The worker already returns unique symbols; keep a client-side dedupe as
  // defense-in-depth so code-based user selections stay unambiguous.
  const seen = new Set<string>();
  const cryptos: Currency[] = [];
  for (const crypto of response.data) {
    if (seen.has(crypto.symbol)) continue;
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

const Tag: React.FC<{ type: Currency['type'] }> = ({ type }) => (
  <span
    className={`font-mono text-[8.5px] font-semibold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-md border ${
      type === 'crypto'
        ? 'text-brand-bright bg-brand-soft border-brand-line'
        : 'text-faint bg-raise border-line2'
    }`}
  >
    {type === 'crypto' ? 'Crypto' : 'Fiat'}
  </span>
);

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

  useEffect(() => {
    let active = true;
    fetchFiatCurrencies()
      .then((fiats) => {
        if (active) setFiatCurrencies(fiats);
      })
      .catch((error) => console.error('Error fetching currencies', error));
    fetchCryptoCurrencies()
      .then((cryptos) => {
        if (active) setCryptoCurrencies(cryptos);
      })
      .catch((error) =>
        console.error('Error fetching cryptocurrencies', error)
      );
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

  const handleBaseCurrencyChange = (currency: string) =>
    setBaseCurrency(currency);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) setAmount(value);
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
    <div className="min-h-screen bg-bg text-ink flex justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* header */}
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[13px] bg-brand-dim border border-brand-line text-brand-bright text-lg">
              ⇄
            </div>
            <div>
              <div className="font-mono text-[15px] font-bold tracking-wide">
                TSUKAKAN
              </div>
              <div className="font-mono text-[9.5px] tracking-[0.18em] text-faint mt-0.5">
                通貨 TERMINAL
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-[13px] border border-line px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand)]" />
            <span className="font-mono text-[10.5px] tracking-widest text-dim">
              LIVE
            </span>
          </div>
        </div>

        {/* meta */}
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint px-1 pt-1 pb-4">
          {baseCurrency} BASE · {currencyList.length} PAIRS · CC0 FEED
        </div>

        {/* hero */}
        <div className="rounded-[18px] border border-line bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] text-faint">
              AMOUNT
            </span>
            <CurrencyDropdown
              currencies={allCurrencies}
              selectedCurrency={baseCurrency}
              onSelect={handleBaseCurrencyChange}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[22px] font-semibold text-faint">
              {baseCurrencyObj?.symbol ?? '$'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="w-full bg-transparent font-mono text-[44px] font-semibold text-ink tabular-nums outline-none placeholder:text-faint"
            />
          </div>
          <div className="mt-4 border-t border-line pt-3.5 font-mono text-[11px] uppercase tracking-wide text-faint">
            Base · <span className="text-dim">{baseCurrencyObj?.name ?? '—'}</span>
          </div>
        </div>

        {/* list head */}
        <div className="flex items-baseline justify-between px-1 pt-6 pb-3">
          <h2 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-dim">
            My currencies
          </h2>
          <span className="font-mono text-[10.5px] text-faint">
            {currencyList.length}
          </span>
        </div>

        {/* ledger */}
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="currency">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="overflow-hidden rounded-[18px] border border-line bg-panel"
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
                          className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3.5"
                        >
                          {currency && baseCurrencyObj ? (
                            <>
                              <CurrencyIcon currency={currency} size={42} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[14.5px] font-bold tracking-wide">
                                    {currency.code}
                                  </span>
                                  <Tag type={currency.type} />
                                </div>
                                <div className="mt-0.5 truncate text-[12.5px] text-faint">
                                  {currency.name}
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <div className="text-[16.5px] font-semibold tabular-nums">
                                  {converted !== null
                                    ? formatAmount(converted)
                                    : '0.00'}
                                </div>
                                <div className="mt-0.5 text-[10.5px] tabular-nums text-faint">
                                  {getDescription(currency, baseCurrencyObj)}
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${currency.code}`}
                                onClick={() => handleCurrenciesList(currencyCode)}
                                className="ml-1 text-faint hover:text-danger"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line2 bg-raise font-mono text-[12px] font-bold text-faint">
                                {currencyCode.slice(0, 3)}
                              </span>
                              <div className="flex-1">
                                <span className="font-mono text-[14.5px] font-bold tracking-wide text-dim">
                                  {currencyCode}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-faint">
                                rate unavailable
                              </span>
                              <button
                                type="button"
                                aria-label={`Remove ${currencyCode}`}
                                onClick={() => handleCurrenciesList(currencyCode)}
                                className="ml-1 text-faint hover:text-danger"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}

                {currencyList.length === 0 && (
                  <div className="p-6 text-center text-[13px] text-faint">
                    No currencies yet — add one with the + button.
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* add */}
        <div className="mt-4 flex justify-end">
          <CurrencySelectionModal
            currencies={allCurrencies}
            selectedCurrency={currencyList}
            onCurrencySelected={handleCurrenciesList}
          />
        </div>
      </div>
    </div>
  );
}
