export default function App() {
  const currencies = [
    { code: 'JPY', flag: '', rate: 147.24, description: '1 USD = 147.24¥' },
    { code: 'USD', flag: '', rate: 1.0, description: '1 USD = 1$' },
    { code: 'EUR', flag: '', rate: 0.92, description: '1 USD = 0.919E' },
    { code: 'AUD', flag: '', rate: 1.5, description: '1 USD = 1.504$' },
    { code: 'CHF', flag: '', rate: 0.87, description: '1 USD = 0.87CHF' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
          Currency Converter
        </h1>

        <div className="space-y-4">
          <div className="inline-flex items-center bg-slate-400 rounded-2xl p-2 ml-2">
            <span className="text-2xl mr-2">🇺🇸</span>
            <select className="bg-transparent text-white text-md font-semibold focus:outline-none">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </select>
          </div>

          <div className="bg-slate-400 rounded-3xl p-4 flex items-center justify-between">
            <div className="flex items-center flex-grow">
              <span className="text-white text-3xl font-bold mr-2">$</span>
              <input
                type=""
                defaultValue="1"
                className="bg-transparent text-white text-3xl font-bold focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg mt-6 p-6">
          <h1 className="text-2xl font-bold mb-4">Fiat</h1>

          <div className="space-y-2">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{currency.flag}</span>
                  <span className="font-semibold">{currency.code}</span>
                </div>
                <div className="flex items-center">
                  <div className="text-right">
                    <div className="font-semibold">
                      {currency.code === 'CHF'
                        ? `CHF ${currency.rate.toFixed(2)}`
                        : `${currency.rate.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currency.description}
                    </div>
                  </div>
                  <button className="ml-4 text-gray-400">⋮</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl">
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
