import { useState } from 'react';
import type { Currency } from '../lib/currency';

/**
 * Full-bleed circular currency icon (spec 16).
 * - Fiat: a flag image from flagcdn, keyed by the currency's country code
 *   (first two letters, e.g. USD->us, EUR->eu).
 * - Crypto: the worker-provided coin logo (`currency.flag` holds the iconUrl).
 * On image error, falls back to a neutral circle showing the code.
 */
const flagUrl = (code: string) =>
  `https://flagcdn.com/w160/${code.slice(0, 2).toLowerCase()}.png`;

interface Props {
  currency: Currency;
  size?: number;
}

const CurrencyIcon: React.FC<Props> = ({ currency, size = 42 }) => {
  const [failed, setFailed] = useState(false);
  const isCrypto = currency.type === 'crypto';
  const src = isCrypto ? currency.flag : flagUrl(currency.code);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raise border ${
        isCrypto ? 'border-brand-line' : 'border-line2'
      }`}
      style={{ width: size, height: size }}
    >
      {failed || !src ? (
        <span
          className="font-mono font-bold text-dim"
          style={{ fontSize: size * 0.28 }}
        >
          {currency.code.slice(0, 3)}
        </span>
      ) : (
        <img
          src={src}
          alt={currency.code}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
};

export default CurrencyIcon;
