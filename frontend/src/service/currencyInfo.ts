export interface CurrencyDetails {
  name: string;
  symbol: string;
  /**
   * Explicit flag emoji override. Only needed for codes whose first two
   * letters are NOT an ISO country (e.g. XOF -> "XO" is not a country).
   * When omitted, the flag is derived from the code by getFlagEmoji().
   * All entries below use ISO-country prefixes, so no override is required
   * (EUR works too: "EU" is a valid flag region).
   */
  flag?: string;
}

// ~30 most-traded fiat currencies. Codes here all have ISO-country prefixes,
// so getFlagEmoji() derives their flags correctly. Add a `flag` override for
// any future code whose two-letter prefix is not a country.
export const currencyInfo: { [key: string]: CurrencyDetails } = {
  USD: { name: 'United States Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  GBP: { name: 'British Pound', symbol: '£' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
  MXN: { name: 'Mexican Peso', symbol: 'Mex$' },
  SEK: { name: 'Swedish Krona', symbol: 'kr' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr' },
  DKK: { name: 'Danish Krone', symbol: 'kr' },
  PLN: { name: 'Polish Zloty', symbol: 'zł' },
  THB: { name: 'Thai Baht', symbol: '฿' },
  TWD: { name: 'New Taiwan Dollar', symbol: 'NT$' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
  TRY: { name: 'Turkish Lira', symbol: '₺' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  RUB: { name: 'Russian Ruble', symbol: '₽' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM' },
  PHP: { name: 'Philippine Peso', symbol: '₱' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼' },
  ILS: { name: 'Israeli New Shekel', symbol: '₪' },
};

export const currencyCodes = Object.keys(currencyInfo);
