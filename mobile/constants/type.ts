export interface Currency {
  /**
   * Stable, collision-free identity used for React keys and lookups.
   * Fiat: `fiat-<code>` (e.g. `fiat-USD`).
   * Crypto: `crypto-<coinpaprika id>` (e.g. `crypto-btc-bitcoin`).
   * A ticker symbol alone is not unique (the same symbol can appear for more
   * than one coin, and a crypto ticker can collide with a fiat code), so `id`
   * is the safe key.
   */
  id: string;
  code: string;
  name: string;
  flag: string;
  rate: number;
  symbol: string;
  type: 'crypto' | 'fiat';
}
