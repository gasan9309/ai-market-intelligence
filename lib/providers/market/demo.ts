import { MarketDataProvider, MarketQuote } from "./types";
import { db } from "@/lib/db/client";
import { marketSnapshots } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { dbFirst } from "@/lib/db/query";

const SEED_PRICES: Record<string, number> = {
  BTC: 104_820,
  ETH: 3_820,
  EURUSD: 1.083,
  SPY: 561.2,
  GOLD: 2_640,
};

// Rough per-tick volatility (stddev of pct return) per asset, tuned so a
// multi-minute poll interval produces believable, not wild, moves.
const VOL: Record<string, number> = {
  BTC: 0.0025,
  ETH: 0.0032,
  EURUSD: 0.0006,
  SPY: 0.0009,
  GOLD: 0.0008,
};

export class DemoMarketDataProvider implements MarketDataProvider {
  name = "demo";
  supports = Object.keys(SEED_PRICES);

  async fetchQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const now = new Date();
    const quotes: MarketQuote[] = [];

    for (const symbol of symbols) {
      const last = await dbFirst<{ price: number }>(
        db.select().from(marketSnapshots).where(eq(marketSnapshots.asset, symbol)).orderBy(desc(marketSnapshots.timestamp)).limit(1)
      );

      const lastPrice = last?.price ?? SEED_PRICES[symbol] ?? 100;
      const vol = VOL[symbol] ?? 0.001;
      // small mean-reverting drift + gaussian-ish noise via sum of uniforms
      const noise = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const pctChange = noise * vol;
      const price = Math.max(0.0001, lastPrice * (1 + pctChange));

      quotes.push({
        asset: symbol,
        price: round(price, symbol),
        volume: 1_000_000 * (0.6 + Math.random() * 0.8),
        source: "demo",
        timestamp: now,
      });
    }

    return quotes;
  }
}

function round(price: number, symbol: string): number {
  const decimals = symbol === "EURUSD" ? 4 : symbol === "BTC" || symbol === "SPY" ? 2 : 2;
  const factor = 10 ** decimals;
  return Math.round(price * factor) / factor;
}
