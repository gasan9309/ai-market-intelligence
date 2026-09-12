import { MarketDataProvider } from "./types";
import { DemoMarketDataProvider } from "./demo";
import { CoinGeckoProvider } from "./coingecko";
import { AlphaVantageProvider } from "./alphavantage";
import { resolveMode } from "@/lib/config";

/**
 * Single place deciding which MarketDataProvider(s) back the app. Add a new
 * provider file + one line here to bring in another source.
 */
export function getMarketDataProviders(): MarketDataProvider[] {
  const mode = resolveMode();
  if (mode === "demo") return [new DemoMarketDataProvider()];

  const providers: MarketDataProvider[] = [new CoinGeckoProvider()]; // free, no key
  if (process.env.MARKET_DATA_API_KEY) {
    providers.push(new AlphaVantageProvider(process.env.MARKET_DATA_API_KEY));
  }
  return providers;
}

export type { MarketDataProvider };
