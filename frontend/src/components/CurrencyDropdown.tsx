import { useEffect, useRef, useState } from 'react';

interface Currency {
  code: string;
  name: string;
  flag: string;
  symbol: string;
}

interface CurrencyDropdownProps {
  currencies: Currency[];
  selectedCurrency: string;
  onSelect: (currency: string) => void;
}

const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  currencies,
  selectedCurrency,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="flex items-center bg-slate-400 rounded-lg p-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{currencies.find((c) => c.code === selectedCurrency)?.flag}</span>
        <span>{selectedCurrency}</span>
      </div>
      {isOpen && (
        <div className="absolute mt-1 w-full bg-slate-300 rounded-lg shadow-lg z-10">
          <input
            type="text"
            placeholder="search"
            className="w-full p-2 border-b"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="max-h60 overflow-y-auto">
            {filteredCurrencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => {
                  onSelect(currency.code);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center">
                  <span className="mr-2">{currency.flag}</span>
                  <div>
                    <div>{currency.code}</div>
                    <div className="text-sm text-gray-500">{currency.name}</div>
                  </div>
                </div>
                <span>{currency.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyDropdown;
