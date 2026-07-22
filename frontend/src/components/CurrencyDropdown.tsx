import { useEffect, useRef, useState } from 'react';
import type { Currency } from '../lib/currency';
import CurrencyIcon from './CurrencyIcon';

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = currencies.find((c) => c.code === selectedCurrency);
  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-raise border border-line2 py-1.5 pl-1.5 pr-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected && <CurrencyIcon currency={selected} size={22} />}
        <span className="font-mono text-[13px] font-semibold tracking-wide">
          {selectedCurrency}
        </span>
        <span className="text-brand-bright text-[10px]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line bg-panel2 shadow-2xl overflow-hidden">
          <div className="border-b border-line p-2">
            <input
              type="text"
              placeholder="Search currencies"
              className="w-full rounded-lg bg-bg border border-line2 px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:outline-none focus:border-brand-line"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredCurrencies.map((currency) => (
              <button
                type="button"
                key={currency.id}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-raise cursor-pointer"
                onClick={() => {
                  onSelect(currency.code);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <CurrencyIcon currency={currency} size={30} />
                <span className="min-w-0">
                  <span className="block font-mono text-[13px] font-bold tracking-wide">
                    {currency.code}
                  </span>
                  <span className="block truncate text-[12px] text-faint">
                    {currency.name}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyDropdown;
