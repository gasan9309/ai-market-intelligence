import { MarketDataProvider, MarketQuote } from "./types";

/**
 * Alpha Vantage covers our non-crypto assets (EUR/USD, SPY, Gold via XAU
 * proxy through the FX endpoint). Requires MARKET_DATA_API_KEY. Untested in
 * this sandbox but implemented against Alpha Vantage's documented REST API.
 * Free tier is rate-limited (5 req/min) — fine for a 1-5 minute poll cycle
 * across a handful of symbols.
 */
export class AlphaVantageProvider implements MarketDataProvider {
  name = "alphavantage";
  supports = ["EURUSD", "SPY", "GOLD"];

  constructor(private apiKey: string) {}

  async fetchQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const wanted = symbols.filter((s) => this.supports.includes(s));
    const now = new Date();
    const results: MarketQuote[] = [];

    for (const symbol of wanted) {
      try {
        if (symbol === "EURUSD") {
          const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${this.apiKey}`;
          const data = await getJson(url);
          const price = parseFloat(data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
          if (price) results.push({ asset: symbol, price, source: "alphavantage", timestamp: now });
        } else if (symbol === "GOLD") {
          const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${this.apiKey}`;
          const data = await getJson(url);
          const price = parseFloat(data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
          if (price) results.push({ asset: symbol, price, source: "alphavantage", timestamp: now });
        } else if (symbol === "SPY") {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${this.apiKey}`;
          const data = await getJson(url);
          const price = parseFloat(data?.["Global Quote"]?.["05. price"]);
          const volume = parseFloat(data?.["Global Quote"]?.["06. volume"]);
          if (price) results.push({ asset: symbol, price, volume, source: "alphavantage", timestamp: now });
        }
      } catch (err) {
        console.error(`[AlphaVantageProvider] failed for ${symbol}:`, (err as Error).message);
      }
    }

    return results;
  }
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
