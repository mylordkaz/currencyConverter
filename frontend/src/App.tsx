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
}

const apiURL = import.meta.env.VITE_API_URL as string;

export default function App() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [amount, setAmount] = useState<string>('');
  const [currencyList, setCurrencyList] = useState<string[]>(() => {
    const savedList = localStorage.getItem('currencyList');
    return savedList ? JSON.parse(savedList) : [];
  });

  useEffect(() => {
    fetchCurrencies();
  }, [baseCurrency]);

  useEffect(() => {
    localStorage.setItem('currencyList', JSON.stringify(currencyList));
  }, [currencyList]);

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(
        `${apiURL}api/fiat?base=${baseCurrency}`
      );

      const rates = response.data.rates;
      const newCurrencies: Currency[] = currencyCodes
        .filter((code) => code in rates)
        .map((code) => ({
          code,
          name: currencyInfo[code].name,
          flag: getFlagEmoji(code),
          rate: rates[code],
          symbol: currencyInfo[code].symbol,
          description: `1 ${baseCurrency} = ${rates[code]}${code}`,
        }));
      setCurrencies(newCurrencies);
      setBaseCurrency(response.data.base);
    } catch (error) {
      console.error('Error fetching currencies', error);
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
      <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-8 text-center text-black">
            Currency Converter
          </h1>

          <div className="space-y-4">
            <CurrencyDropdown
              currencies={currencies}
              selectedCurrency={baseCurrency}
              onSelect={handleBaseCurrencyChange}
            />

            <div className="bg-slate-400 rounded-3xl p-4 flex items-center justify-between">
              <div className="flex items-center flex-grow">
                <span className="text-white text-3xl font-bold mr-2">
                  {currencies.find((c) => c.code === baseCurrency)?.symbol}
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
                    const currency = currencies.find(
                      (c) => c.code === currencyCode
                    );
                    if (!currency) return null;
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
                              <span className="text-2xl mr-2">
                                {currency.flag}
                              </span>
                              <span className="font-semibold">
                                {currency.code}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <div className="text-right">
                                <div className="font-semibold">
                                  {amount
                                    ? (
                                        currency.rate * parseFloat(amount)
                                      ).toFixed(2)
                                    : '0.00'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {currency.description}
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
                currencies={currencies}
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
