import { MarketDataProvider, MarketQuote } from "./types";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
};

/**
 * CoinGecko's public /simple/price endpoint requires no API key, so this
 * provider works "live" for BTC/ETH even with zero configuration. Untested
 * in this sandbox (outbound network here is limited to package registries)
 * but implemented against CoinGecko's documented public API.
 */
export class CoinGeckoProvider implements MarketDataProvider {
  name = "coingecko";
  supports = Object.keys(COINGECKO_IDS);

  async fetchQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const wanted = symbols.filter((s) => COINGECKO_IDS[s]);
    if (wanted.length === 0) return [];
    const ids = wanted.map((s) => COINGECKO_IDS[s]).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko error: HTTP ${res.status}`);
    const data = await res.json();
    const now = new Date();

    return wanted.map((symbol) => {
      const g = data[COINGECKO_IDS[symbol]];
      return {
        asset: symbol,
        price: g?.usd,
        volume: g?.usd_24h_vol,
        source: "coingecko",
        timestamp: now,
      } satisfies MarketQuote;
    });
  }
}
