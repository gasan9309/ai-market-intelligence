export interface MarketQuote {
  asset: string; // internal symbol e.g. "BTC"
  price: number;
  volume?: number;
  source: string;
  timestamp: Date;
}

export interface MarketDataProvider {
  name: string;
  /** Which internal asset symbols this provider can serve. */
  supports: string[];
  fetchQuotes(symbols: string[]): Promise<MarketQuote[]>;
}
