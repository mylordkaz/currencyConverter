// Mirrors frontend/src/lib/currency.test.ts (spec 11). Keep the cases in sync
// with the web suite; only the imports differ (jest vs vitest, and Currency is
// imported from @/constants/type rather than declared in the lib).
import { describe, it, expect } from '@jest/globals';
import { Currency } from '@/constants/type';
import {
  convertCurrency,
  getDescriptionRate,
  getDescription,
  getFlagEmoji,
  formatAmount,
} from '@/lib/currency';

// Realistic rates. Fiat rate = units per 1 USD; crypto rate = USD price of 1 unit.
const USD: Currency = { id: 'fiat-USD', code: 'USD', flag: '🇺🇸', rate: 1, name: 'US Dollar', symbol: '$', type: 'fiat' };
const EUR: Currency = { id: 'fiat-EUR', code: 'EUR', flag: '🇪🇺', rate: 0.92, name: 'Euro', symbol: '€', type: 'fiat' };
const JPY: Currency = { id: 'fiat-JPY', code: 'JPY', flag: '🇯🇵', rate: 150, name: 'Japanese Yen', symbol: '¥', type: 'fiat' };
const BTC: Currency = { id: 'crypto-1', code: 'BTC', flag: 'btc.png', rate: 60000, name: 'Bitcoin', symbol: 'BTC', type: 'crypto' };
const ETH: Currency = { id: 'crypto-1027', code: 'ETH', flag: 'eth.png', rate: 3000, name: 'Ethereum', symbol: 'ETH', type: 'crypto' };

/** Relative-tolerance float equality. */
function expectClose(actual: number, expected: number, rel = 1e-9): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(expected)));
}

describe('convertCurrency', () => {
  it('fiat -> fiat (JPY -> EUR via USD-based rates)', () => {
    // 1500 JPY / 150 = 10 USD; 10 * 0.92 = 9.2 EUR
    expect(convertCurrency(1500, JPY, EUR)).toBeCloseTo(9.2, 6);
  });

  it('fiat -> crypto (USD -> BTC)', () => {
    // 60000 USD / 60000 = 1 BTC
    expect(convertCurrency(60000, USD, BTC)).toBeCloseTo(1, 6);
  });

  it('crypto -> fiat (BTC -> USD / EUR)', () => {
    // 2 BTC * 60000 = 120000 USD
    expect(convertCurrency(2, BTC, USD)).toBeCloseTo(120000, 6);
    // 1 BTC * 60000 * 0.92 = 55200 EUR
    expect(convertCurrency(1, BTC, EUR)).toBeCloseTo(55200, 3);
  });

  it('crypto -> crypto (BTC -> ETH)', () => {
    // 1 BTC * 60000 / 3000 = 20 ETH
    expect(convertCurrency(1, BTC, ETH)).toBeCloseTo(20, 6);
  });

  it('preserves precision on tiny values (1 JPY -> BTC is not zero)', () => {
    const value = convertCurrency(1, JPY, BTC);
    expect(value).not.toBeNull();
    expect(value as number).toBeGreaterThan(0);
    // 1 / (150 * 60000) ~= 1.1111e-7
    expectClose(value as number, 1 / (150 * 60000));
  });

  it('identity (same code) returns the amount unchanged', () => {
    expect(convertCurrency(123.45, BTC, BTC)).toBe(123.45);
    expect(convertCurrency(50, USD, USD)).toBe(50);
  });

  it('NaN / non-finite amount -> null', () => {
    expect(convertCurrency(NaN, USD, EUR)).toBeNull();
    expect(convertCurrency(parseFloat(''), USD, EUR)).toBeNull();
    expect(convertCurrency(Infinity, USD, EUR)).toBeNull();
  });

  it('zero / negative rate -> null', () => {
    const zeroCrypto: Currency = { ...BTC, rate: 0 };
    const negFiat: Currency = { ...EUR, rate: -1 };
    expect(convertCurrency(100, USD, zeroCrypto)).toBeNull();
    expect(convertCurrency(100, zeroCrypto, USD)).toBeNull();
    expect(convertCurrency(100, negFiat, USD)).toBeNull();
  });
});

describe('getDescriptionRate consistency with convertCurrency', () => {
  const pairs: Array<[Currency, Currency, string]> = [
    [USD, EUR, 'fiat base / fiat currency'],
    [USD, BTC, 'fiat base / crypto currency'],
    [JPY, BTC, 'fiat base / crypto currency (tiny)'],
    [BTC, USD, 'crypto base / fiat currency'],
    [BTC, ETH, 'crypto base / crypto currency'],
  ];

  for (const [base, currency, label] of pairs) {
    it(`getDescriptionRate(c, base) === convertCurrency(1, base, c) [${label}]`, () => {
      const rate = getDescriptionRate(currency, base);
      const conv = convertCurrency(1, base, currency);
      expect(rate).not.toBeNull();
      expect(conv).not.toBeNull();
      expectClose(rate as number, conv as number);
    });
  }

  it('returns null for non-positive rates', () => {
    const zero: Currency = { ...BTC, rate: 0 };
    expect(getDescriptionRate(zero, USD)).toBeNull();
    expect(getDescriptionRate(USD, zero)).toBeNull();
  });
});

describe('getDescription', () => {
  it('shows 1:1 for identical codes', () => {
    expect(getDescription(USD, USD)).toBe('1 USD = 1 USD');
  });

  it('formats the cross rate', () => {
    // 1 USD = 0.92 EUR
    expect(getDescription(EUR, USD)).toBe('1 USD = 0.92 EUR');
  });
});

describe('formatAmount', () => {
  it('rounds values >= 1 to 2 decimals with grouped thousands', () => {
    expect(formatAmount(1234.567)).toBe('1,234.57');
    expect(formatAmount(5)).toBe('5.00');
    expect(formatAmount(3136263.54)).toBe('3,136,263.54');
  });

  it('keeps 4 significant digits for values < 1 (never "0.0000")', () => {
    const out = formatAmount(0.00000011);
    expect(out).toBe('0.00000011');
    expect(out).not.toBe('0.0000');
    expect(out).toMatch(/[1-9]/);
  });

  it('formats 0 as "0.00"', () => {
    expect(formatAmount(0)).toBe('0.00');
  });

  it('formats non-finite as "0.00"', () => {
    expect(formatAmount(NaN)).toBe('0.00');
    expect(formatAmount(Infinity)).toBe('0.00');
  });
});

describe('getFlagEmoji', () => {
  it('derives a flag from an ISO-country code', () => {
    expect(getFlagEmoji('USD')).toBe('🇺🇸');
    expect(getFlagEmoji('EUR')).toBe('🇪🇺');
  });

  it('uses the explicit override for non-country codes', () => {
    expect(getFlagEmoji('XOF', '🌍')).toBe('🌍');
  });
});
