import { db } from "@/lib/db/client";
import { marketSnapshots, predictions } from "@/lib/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { dbFirst } from "@/lib/db/query";
import { ASSETS, resolveMode } from "@/lib/config";
import { HORIZONS, Horizon } from "@/lib/types";
import { getRecentAlerts } from "./alerts";

export interface AssetCardData {
  symbol: string;
  displaySymbol: string;
  name: string;
  currentPrice: number | null;
  change24h: number | null;
  lastUpdated: string | null;
  predictions: Partial<
    Record<
      Horizon,
      {
        probabilityUp: number;
        signal: string;
        confidenceLabel: string;
        confidenceScore: number;
      }
    >
  >;
}

export async function getDashboardData() {
  const mode = resolveMode();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);

  const assetCards: AssetCardData[] = await Promise.all(
    ASSETS.map(async (asset) => {
      const latest = await dbFirst<{ price: number; timestamp: Date }>(
        db.select().from(marketSnapshots).where(eq(marketSnapshots.asset, asset.symbol)).orderBy(desc(marketSnapshots.timestamp)).limit(1)
      );

      const dayAgoRow = await dbFirst<{ price: number }>(
        db
          .select()
          .from(marketSnapshots)
          .where(and(eq(marketSnapshots.asset, asset.symbol), gte(marketSnapshots.timestamp, dayAgo)))
          .orderBy(asc(marketSnapshots.timestamp))
          .limit(1)
      );

      const change24h = latest && dayAgoRow && dayAgoRow.price > 0 ? (latest.price - dayAgoRow.price) / dayAgoRow.price : null;

      const preds: AssetCardData["predictions"] = {};
      for (const horizon of HORIZONS) {
        const p = await dbFirst<{
          probabilityUp: number;
          signal: string;
          confidenceLabel: string;
          confidenceScore: number;
        }>(
          db
            .select()
            .from(predictions)
            .where(and(eq(predictions.asset, asset.symbol), eq(predictions.horizon, horizon)))
            .orderBy(desc(predictions.predictionTimestamp))
            .limit(1)
        );
        if (p) {
          preds[horizon] = {
            probabilityUp: p.probabilityUp,
            signal: p.signal,
            confidenceLabel: p.confidenceLabel,
            confidenceScore: p.confidenceScore,
          };
        }
      }

      return {
        symbol: asset.symbol,
        displaySymbol: asset.displaySymbol,
        name: asset.name,
        currentPrice: latest?.price ?? null,
        change24h,
        lastUpdated: latest?.timestamp.toISOString() ?? null,
        predictions: preds,
      };
    })
  );

  const lastMarketUpdate = assetCards.reduce<string | null>((acc, a) => {
    if (!a.lastUpdated) return acc;
    return !acc || a.lastUpdated > acc ? a.lastUpdated : acc;
  }, null);

  const alerts = await getRecentAlerts("1h", 10);

  return {
    mode,
    timestamp: now.toISOString(),
    lastMarketUpdate,
    assets: assetCards,
    alerts,
  };
}
