import { db } from "@/lib/db/client";
import { macroSnapshots, marketSnapshots } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";

export interface MacroFeatureSet {
  dxyValue: number | null;
  dxyChange: number | null;
  vixValue: number | null;
  vixChange: number | null;
  us10yValue: number | null;
  us10yChange: number | null;
}

const SERIES = ["DXY", "VIX", "US10Y"] as const;

/**
 * Reads the most recent macro snapshot at-or-before `asOf` (never after —
 * same no-future-information rule as market/news features) plus one from
 * ~24h earlier, and returns level + 24h change per series. Missing series
 * (no snapshots ingested yet) come back as null, not fabricated.
 */
export async function computeMacroFeatures(asOf: Date): Promise<MacroFeatureSet> {
  const lookbackStart = new Date(asOf.getTime() - 30 * 60 * 60_000); // small buffer past 24h
  const rows = await dbAll<{ series: string; value: number; timestamp: Date }>(
    db
      .select({ series: macroSnapshots.series, value: macroSnapshots.value, timestamp: macroSnapshots.timestamp })
      .from(macroSnapshots)
      .where(and(gte(macroSnapshots.timestamp, lookbackStart), lte(macroSnapshots.timestamp, asOf)))
      .orderBy(asc(macroSnapshots.timestamp))
  );

  const result: MacroFeatureSet = {
    dxyValue: null,
    dxyChange: null,
    vixValue: null,
    vixChange: null,
    us10yValue: null,
    us10yChange: null,
  };

  for (const series of SERIES) {
    const seriesRows = rows.filter((r) => r.series === series);
    if (seriesRows.length === 0) continue;
    const latest = seriesRows[seriesRows.length - 1];
    const dayAgoTarget = asOf.getTime() - 24 * 60 * 60_000;
    const dayAgoRow = seriesRows.reduce<typeof seriesRows[number] | null>((best, r) => {
      const diff = Math.abs(r.timestamp.getTime() - dayAgoTarget);
      const bestDiff = best ? Math.abs(best.timestamp.getTime() - dayAgoTarget) : Infinity;
      return diff < bestDiff ? r : best;
    }, null);

    const change = dayAgoRow && dayAgoRow.value !== 0 ? (latest.value - dayAgoRow.value) / dayAgoRow.value : null;

    if (series === "DXY") {
      result.dxyValue = latest.value;
      result.dxyChange = change !== null ? round4(change) : null;
    } else if (series === "VIX") {
      result.vixValue = latest.value;
      result.vixChange = change !== null ? round4(change) : null;
    } else if (series === "US10Y") {
      result.us10yValue = latest.value;
      result.us10yChange = change !== null ? round4(change) : null;
    }
  }

  return result;
}

/** BTC/ETH price ratio as of `asOf` — null if either leg is missing data. */
export async function computeBtcEthRatio(asOf: Date): Promise<number | null> {
  const lookbackStart = new Date(asOf.getTime() - 60 * 60_000);

  const [btcRows, ethRows] = await Promise.all([
    dbAll<{ price: number }>(
      db
        .select({ price: marketSnapshots.price })
        .from(marketSnapshots)
        .where(and(eq(marketSnapshots.asset, "BTC"), gte(marketSnapshots.timestamp, lookbackStart), lte(marketSnapshots.timestamp, asOf)))
        .orderBy(asc(marketSnapshots.timestamp))
    ),
    dbAll<{ price: number }>(
      db
        .select({ price: marketSnapshots.price })
        .from(marketSnapshots)
        .where(and(eq(marketSnapshots.asset, "ETH"), gte(marketSnapshots.timestamp, lookbackStart), lte(marketSnapshots.timestamp, asOf)))
        .orderBy(asc(marketSnapshots.timestamp))
    ),
  ]);

  const btc = btcRows[btcRows.length - 1]?.price;
  const eth = ethRows[ethRows.length - 1]?.price;
  if (!btc || !eth || eth === 0) return null;
  return round4(btc / eth);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
