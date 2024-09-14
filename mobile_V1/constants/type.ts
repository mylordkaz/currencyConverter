export interface Currency {
  code: string;
  name: string;
  flag: string;
  rate: number;
  symbol: string;
  type: 'crypto' | 'fiat';
}
