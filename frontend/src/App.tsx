import axios from 'axios';
import React, { useEffect, useState } from 'react';
import CurrencyDropdown from './components/CurrencyDropdown';
import { currencyCodes, currencyInfo } from './service/currencyInfo';
import CurrencySelectionModal from './components/CurrencySelectionModal';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';

interface Currency {
  code: string;
  flag: string;
  rate: number;
  description: string;
  name: string;
  symbol: string;
  type: 'fiat' | 'crypto';
}

const apiURL = import.meta.env.VITE_API_URL as string;

function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  _baseCurrency: string
): number | null {
  if (isNaN(amount) || !isFinite(amount)) {
    console.error('Invalid amount for conversion');
    return null;
  }

  if (!from || !to) {
    console.error('Invalid currency for conversion');
    return null;
  }

  if (from.code === to.code) {
    return amount;
  }

  try {
    let convertedAmount: number;

    if (from.type === 'crypto' && to.type === 'fiat') {
      const amountInUsd = amount * from.rate;
      convertedAmount = amountInUsd * to.rate;
    } else if (from.type === 'fiat' && to.type === 'crypto') {
      const amountInUsd = amount / from.rate;
      convertedAmount = amountInUsd / to.rate;
    } else if (from.type === 'crypto' && to.type === 'crypto') {
      const amountInUsd = amount * from.rate;
      convertedAmount = amountInUsd / to.rate;
    } else {
      // both fiat
      const amountInUsd = amount / from.rate;
      convertedAmount = amountInUsd * to.rate;
    }

    return Number(convertedAmount.toFixed(6));
  } catch (error) {
    console.error('Error during currency conversion:', error);
    return null;
  }
}

export default function App() {
  const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
  const [cryptoCurrencies, setCryptoCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [amount, setAmount] = useState<string>('');
  const [currencyList, setCurrencyList] = useState<string[]>(() => {
    const savedList = localStorage.getItem('currencyList');
    return savedList ? JSON.parse(savedList) : [];
  });

  const allCurrencies = [...fiatCurrencies, ...cryptoCurrencies];

  console.log('all:', allCurrencies);
  useEffect(() => {
    fetchFiatCurrencies().then(() => fetchCryptoCurrencies());
  }, [baseCurrency]);

  useEffect(() => {
    localStorage.setItem('currencyList', JSON.stringify(currencyList));
  }, [currencyList]);

  const fetchFiatCurrencies = async () => {
    try {
      const response = await axios.get(
        `${apiURL}api/fiat?base=${baseCurrency}`
      );

      const rates = response.data.rates;
      const fiats: Currency[] = currencyCodes
        .filter((code) => code in rates)
        .map((code) => ({
          code,
          name: currencyInfo[code].name,
          flag: getFlagEmoji(code),
          rate: rates[code],
          symbol: currencyInfo[code].symbol,
          description: `1 ${baseCurrency} = ${rates[code]}${code}`,
          type: 'fiat',
        }));
      setFiatCurrencies(fiats);
      setBaseCurrency(response.data.base);
    } catch (error) {
      console.error('Error fetching currencies', error);
    }
  };

  const fetchCryptoCurrencies = async () => {
    try {
      const response = await axios.get(`${apiURL}api/crypto`);

      const BaseRateUsd =
        fiatCurrencies.find((c) => c.code === baseCurrency)?.rate || 1;
      console.log('BaserateUsd:', BaseRateUsd);
      const cryptos = response.data.map((crypto: any) => {
        const usdPrice = crypto.quote.USD.price;
        const basePrice =
          baseCurrency === 'USD' ? usdPrice : usdPrice * BaseRateUsd;

        console.log('crypto USD price:', usdPrice);
        console.log('crypto base price:', basePrice);

        return {
          code: crypto.symbol,
          name: crypto.name,
          flag: `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`,
          rate: basePrice,
          symbol: crypto.symbol,
          description: `1 ${crypto.symbol} = ${basePrice.toFixed(
            2
          )} ${baseCurrency}`,
          type: 'crypto',
        };
      });
      console.log('cryptos:', cryptos);
      setCryptoCurrencies(cryptos);
    } catch (error) {
      console.error('Error fetching cryptocurrencies', error);
    }
  };

  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .slice(0, 2)
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const handleBaseCurrencyChange = (currency: string) => {
    setBaseCurrency(currency);
  };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleCurrenciesList = (currencyCode: string) => {
    setCurrencyList((prev) =>
      prev.includes(currencyCode)
        ? prev.filter((code) => code !== currencyCode)
        : [...prev, currencyCode]
    );
  };

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(currencyList);
    const [reorderItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderItem);

    setCurrencyList(items);
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <div className=" min-h-screen bg-gradient-to-b from-blue-400 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-8 text-center text-black">
            Currency Converter
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
                  {allCurrencies.find((c) => c.code === baseCurrency)?.symbol}
                </span>
                <input
                  type=""
                  value={amount}
                  onChange={handleAmountChange}
                  className="bg-transparent text-white text-3xl font-bold focus:outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-md bg-white rounded-3xl shadow-lg mt-6 p-6">
            <h1 className="text-2xl font-bold mb-4">Fiat</h1>

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
                    if (!currency) {
                      console.log(
                        `Currency not found for code: ${currencyCode}`
                      );
                      return null;
                    }
                    const baseCurrencyObj = allCurrencies.find(
                      (c) => c.code === baseCurrency
                    );
                    if (!baseCurrencyObj) return null;
                    const convertedAmount = convertCurrency(
                      parseFloat(amount) || 0,
                      baseCurrencyObj,
                      currency,
                      baseCurrency
                    );

                    // Directly use the description field from the currency object
                    const description =
                      currency.description ||
                      `No description available for ${currencyCode}`;

                    return (
                      <Draggable
                        key={currency.code}
                        draggableId={currency.code}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
                          >
                            <div className="flex items-center">
                              {currency.type === 'crypto' ? (
                                <img
                                  src={currency.flag}
                                  alt={currency.name}
                                  className="w-6 h-6 mr-2"
                                />
                              ) : (
                                <span className="mr-2">{currency.flag}</span>
                              )}
                              <span className="font-semibold">
                                {currency.code}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <div className="text-right">
                                <div className="font-semibold">
                                  {convertedAmount !== null
                                    ? convertedAmount.toFixed(2)
                                    : '0.00'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {description}
                                </div>
                              </div>
                              <button className="ml-4 text-gray-400">⋮</button>
                            </div>
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
