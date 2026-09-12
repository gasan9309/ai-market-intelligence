import { db } from "@/lib/db/client";
import { marketSnapshots } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { stddev } from "@/lib/util";

export interface MarketFeatureSet {
  currentPrice: number;
  priceChange5m: number | null;
  priceChange15m: number | null;
  priceChange1h: number | null;
  priceChange4h: number | null;
  priceChange24h: number | null;
  volumeChange: number | null;
  volatility: number | null;
  momentum: number | null;
}

const WINDOWS_MS = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

/** Find the snapshot closest to `target` within a tolerance window. */
function findNearestPrice(rows: { price: number; timestamp: Date }[], target: number, toleranceMs: number): number | null {
  let best: { price: number; diff: number } | null = null;
  for (const r of rows) {
    const diff = Math.abs(r.timestamp.getTime() - target);
    if (diff <= toleranceMs && (!best || diff < best.diff)) {
      best = { price: r.price, diff };
    }
  }
  return best?.price ?? null;
}

export async function computeMarketFeatures(asset: string, asOf: Date): Promise<MarketFeatureSet> {
  const lookbackStart = new Date(asOf.getTime() - 25 * 60 * 60_000);
  const rows = await dbAll<{ price: number; volume: number | null; timestamp: Date }>(
    db
      .select()
      .from(marketSnapshots)
      .where(and(eq(marketSnapshots.asset, asset), gte(marketSnapshots.timestamp, lookbackStart), lte(marketSnapshots.timestamp, asOf)))
      .orderBy(asc(marketSnapshots.timestamp))
  );

  if (rows.length === 0) {
    return {
      currentPrice: 0,
      priceChange5m: null,
      priceChange15m: null,
      priceChange1h: null,
      priceChange4h: null,
      priceChange24h: null,
      volumeChange: null,
      volatility: null,
      momentum: null,
    };
  }

  const current = rows[rows.length - 1];
  const currentPrice = current.price;
  const now = current.timestamp.getTime();

  const changeAt = (windowMs: number, toleranceMs: number) => {
    const past = findNearestPrice(rows, now - windowMs, toleranceMs);
    if (past === null || past === 0) return null;
    return round4((currentPrice - past) / past);
  };

  const priceChange5m = changeAt(WINDOWS_MS["5m"], 3 * 60_000);
  const priceChange15m = changeAt(WINDOWS_MS["15m"], 6 * 60_000);
  const priceChange1h = changeAt(WINDOWS_MS["1h"], 15 * 60_000);
  const priceChange4h = changeAt(WINDOWS_MS["4h"], 45 * 60_000);
  const priceChange24h = changeAt(WINDOWS_MS["24h"], 3 * 60 * 60_000);

  // volatility: stddev of consecutive returns over the lookback window
  const returns: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].price;
    if (prev > 0) returns.push((rows[i].price - prev) / prev);
  }
  const volatility = returns.length >= 2 ? round4(stddev(returns)) : null;

  // momentum: short-term change minus longer-term change (acceleration proxy)
  const momentum =
    priceChange15m !== null && priceChange4h !== null ? round4(priceChange15m - priceChange4h / 4) : priceChange15m;

  const firstVolume = rows[0].volume ?? null;
  const lastVolume = current.volume ?? null;
  const volumeChange = firstVolume && lastVolume && firstVolume > 0 ? round4((lastVolume - firstVolume) / firstVolume) : null;

  return {
    currentPrice,
    priceChange5m,
    priceChange15m,
    priceChange1h,
    priceChange4h,
    priceChange24h,
    volumeChange,
    volatility,
    momentum,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
