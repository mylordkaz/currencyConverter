import { useEffect, useRef, useState } from 'react';

interface Currency {
  code: string;
  name: string;
  flag: string;
}

interface CurrencySelectionModalProps {
  currencies: Currency[];
  selectedCurrency: string[];
  onCurrencySelected: (currencyCode: string) => void;
}

const CurrencySelectionModal: React.FC<CurrencySelectionModalProps> = ({
  currencies,
  selectedCurrency,
  onCurrencySelected,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(search.toLowerCase()) ||
      currency.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl"
      >
        +
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 bg-gray-100 border-b border-gray-300 rounded-t-lg focus:outline-none focus:ring focus:border-blue-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto">
            {filteredCurrencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => onCurrencySelected(currency.code)}
              >
                <span className="mr-2">{currency.flag}</span>
                <span>
                  {currency.code} - {currency.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelectionModal;
