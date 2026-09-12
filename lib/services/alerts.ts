import { db } from "@/lib/db/client";
import { predictions, newsAnalysis, newsArticles } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { ASSETS } from "@/lib/config";
import { Horizon } from "@/lib/types";

export interface Alert {
  id: string;
  type: "signal_change" | "breaking_news" | "sentiment_shift" | "market_move";
  asset: string;
  message: string;
  timestamp: Date;
}

/**
 * Alerts are computed on read from recent predictions/news/snapshots rather
 * than a separate persisted queue — simplest reliable approach for an MVP
 * dashboard that already stores full history of everything an alert would
 * reference.
 */
export async function getRecentAlerts(horizon: Horizon = "1h", limit = 15): Promise<Alert[]> {
  const alerts: Alert[] = [];

  for (const asset of ASSETS) {
    const recent = await dbAll<{ id: string; probabilityUp: number; signal: string; predictionTimestamp: Date }>(
      db
        .select()
        .from(predictions)
        .where(and(eq(predictions.asset, asset.symbol), eq(predictions.horizon, horizon)))
        .orderBy(desc(predictions.predictionTimestamp))
        .limit(2)
    );

    if (recent.length === 2) {
      const [latest, prev] = recent;
      const delta = latest.probabilityUp - prev.probabilityUp;
      if (Math.abs(delta) >= 0.12) {
        alerts.push({
          id: `signal_${latest.id}`,
          type: "signal_change",
          asset: asset.symbol,
          message: `${asset.displaySymbol} ${horizon} signal moved from ${Math.round(prev.probabilityUp * 100)}% to ${Math.round(latest.probabilityUp * 100)}% (${latest.signal.replace(/_/g, " ").toLowerCase()}).`,
          timestamp: latest.predictionTimestamp,
        });
      }
    }
  }

  const breakingRows = await dbAll<{ id: string; asset: string; importance: number; novelty: number; title: string; publishedAt: Date }>(
    db
      .select({
        id: newsAnalysis.id,
        asset: newsAnalysis.asset,
        importance: newsAnalysis.importance,
        novelty: newsAnalysis.novelty,
        title: newsArticles.title,
        publishedAt: newsArticles.publishedAt,
      })
      .from(newsAnalysis)
      .innerJoin(newsArticles, eq(newsAnalysis.articleId, newsArticles.id))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(30)
  );
  const breaking = breakingRows.filter((r) => r.importance > 0.7 && r.novelty > 0.7);

  for (const b of breaking.slice(0, 5)) {
    alerts.push({
      id: `news_${b.id}`,
      type: "breaking_news",
      asset: b.asset,
      message: `Breaking: "${b.title}"`,
      timestamp: b.publishedAt,
    });
  }

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
