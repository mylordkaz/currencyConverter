// -----------------------------------------------------------------------------
// Shared currency logic.
//
// IMPORTANT: this module is duplicated VERBATIM between the web and mobile apps:
//   - frontend/src/lib/currency.ts
//   - mobile/lib/currency.ts   (this file)
// Keep the two copies in sync. The logic is intentionally self-contained (no
// framework/platform imports) so it can be copied across unchanged. The only
// permitted difference is the Currency type source (web declares it inline;
// mobile imports it from `@/constants/type`).
//
// The conversion formulas are verified correct for all four fiat/crypto
// combinations — do not alter the multiply/divide math when syncing.
// -----------------------------------------------------------------------------

import { Currency } from '@/constants/type';

/**
 * Convert `amount` of `from` into `to`.
 * Returns null for invalid amounts or non-positive rates (guards Infinity/NaN).
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number | null {
  if (isNaN(amount) || !isFinite(amount)) {
    return null;
  }
  if (!from || !to) {
    return null;
  }
  if (from.rate <= 0 || to.rate <= 0) {
    return null;
  }
  if (from.code === to.code) {
    return amount;
  }

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

  return convertedAmount;
}

/**
 * Rate for the "1 BASE = X CURRENCY" description line.
 * Consistent with convertCurrency(1, baseCurrency, currency).
 * Returns null for non-positive rates.
 */
export function getDescriptionRate(
  currency: Currency,
  baseCurrency: Currency
): number | null {
  if (currency.rate <= 0 || baseCurrency.rate <= 0) {
    return null;
  }
  if (baseCurrency.type === 'fiat') {
    if (currency.type === 'fiat') {
      return currency.rate / baseCurrency.rate;
    } else {
      return 1 / (currency.rate * baseCurrency.rate);
    }
  } else {
    if (currency.type === 'fiat') {
      return baseCurrency.rate * currency.rate;
    } else {
      return baseCurrency.rate / currency.rate;
    }
  }
}

/** Human-readable "1 BASE = X CURRENCY" line. */
export function getDescription(
  currency: Currency,
  baseCurrency: Currency
): string {
  if (baseCurrency.code === currency.code) {
    return `1 ${currency.code} = 1 ${baseCurrency.code}`;
  }
  const descriptionRate = getDescriptionRate(currency, baseCurrency);
  if (descriptionRate === null) {
    return `Rate unavailable for ${currency.code}`;
  }
  return `1 ${baseCurrency.code} = ${formatAmount(descriptionRate)} ${currency.code}`;
}

/**
 * Flag emoji for a currency code. Derives a regional-indicator flag from the
 * first two letters (works for ISO-country-prefixed codes, e.g. USD -> US).
 * For codes whose prefix is not an ISO country (e.g. XOF), pass `override`.
 */
export function getFlagEmoji(code: string, override?: string): string {
  if (override) {
    return override;
  }
  const codePoints = code
    .slice(0, 2)
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Format a numeric amount for display.
 * - |value| >= 1: fixed 2 decimals (1234.567 -> "1234.57")
 * - |value| < 1:  up to 4 significant digits, so tiny crypto rates keep
 *   precision (0.00000011 -> "0.00000011", never "0.0000")
 * - 0 / non-finite: "0.00"
 */
export function formatAmount(value: number): string {
  if (isNaN(value) || !isFinite(value) || value === 0) {
    return '0.00';
  }
  if (Math.abs(value) >= 1) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 4,
    useGrouping: false,
  }).format(value);
}
