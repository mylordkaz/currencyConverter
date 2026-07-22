import { useEffect, useRef, useState } from 'react';
import type { Currency } from '../lib/currency';
import CurrencyIcon from './CurrencyIcon';

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(search.toLowerCase()) ||
      currency.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Add currency"
        className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand text-white text-2xl font-light border border-brand-bright shadow-[0_10px_24px_-8px_rgba(61,123,255,0.7)]"
      >
        +
      </button>
      {isOpen && (
        <div className="absolute bottom-16 right-0 z-20 w-80 rounded-xl border border-line bg-panel2 shadow-2xl overflow-hidden">
          <div className="border-b border-line p-3">
            <div className="font-mono text-[15px] font-bold tracking-wide mb-2">
              ADD CURRENCY
            </div>
            <input
              type="text"
              placeholder="Search currencies…"
              className="w-full rounded-lg bg-bg border border-line2 px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:outline-none focus:border-brand-line"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filteredCurrencies.map((currency) => {
              const added = selectedCurrency.includes(currency.code);
              return (
                <button
                  type="button"
                  key={currency.id}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-raise cursor-pointer"
                  onClick={() => onCurrencySelected(currency.code)}
                >
                  <CurrencyIcon currency={currency} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] font-bold tracking-wide">
                      {currency.code}
                    </span>
                    <span className="block truncate text-[12px] text-faint">
                      {currency.name}
                    </span>
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-[15px] ${
                      added
                        ? 'bg-brand text-white border-brand-bright'
                        : 'bg-brand-soft text-brand-bright border-brand-line'
                    }`}
                  >
                    {added ? '✓' : '+'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelectionModal;
