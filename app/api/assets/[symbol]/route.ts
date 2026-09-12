import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { marketSnapshots, predictions, newsArticles, newsAnalysis, features } from "@/lib/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { dbAll, dbFirst } from "@/lib/db/query";
import { getAsset } from "@/lib/config";
import { HORIZONS, Horizon } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();
  const asset = getAsset(symbol);
  if (!asset) return NextResponse.json({ error: "Unknown asset" }, { status: 404 });

  const since = new Date(Date.now() - 3 * 24 * 60 * 60_000);

  const priceHistory = await dbAll<{ price: number; timestamp: Date }>(
    db
      .select({ price: marketSnapshots.price, timestamp: marketSnapshots.timestamp })
      .from(marketSnapshots)
      .where(and(eq(marketSnapshots.asset, symbol), gte(marketSnapshots.timestamp, since)))
      .orderBy(asc(marketSnapshots.timestamp))
  );

  const latestPredictions: Record<string, any> = {};
  for (const horizon of HORIZONS) {
    const p = await dbFirst<{ explanationDrivers: string; riskFactors: string; referencedArticleIds: string; [k: string]: any }>(
      db
        .select()
        .from(predictions)
        .where(and(eq(predictions.asset, symbol), eq(predictions.horizon, horizon)))
        .orderBy(desc(predictions.predictionTimestamp))
        .limit(1)
    );
    if (p) {
      latestPredictions[horizon] = {
        ...p,
        explanationDrivers: JSON.parse(p.explanationDrivers),
        riskFactors: JSON.parse(p.riskFactors),
        referencedArticleIds: JSON.parse(p.referencedArticleIds),
      };
    }
  }

  const predictionHistory1h = await dbAll<{ probabilityUp: number; timestamp: Date }>(
    db
      .select({
        probabilityUp: predictions.probabilityUp,
        timestamp: predictions.predictionTimestamp,
      })
      .from(predictions)
      .where(and(eq(predictions.asset, symbol), eq(predictions.horizon, "1h" as Horizon), gte(predictions.predictionTimestamp, since)))
      .orderBy(asc(predictions.predictionTimestamp))
  );

  const newsRows = await dbAll<{
    id: string;
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    sentiment: number;
    importance: number;
    eventType: string;
    assets: string;
    perAssetImpact: string;
  }>(
    db
      .select({
        id: newsArticles.id,
        title: newsArticles.title,
        source: newsArticles.source,
        url: newsArticles.url,
        publishedAt: newsArticles.publishedAt,
        sentiment: newsAnalysis.sentiment,
        importance: newsAnalysis.importance,
        eventType: newsAnalysis.eventType,
        assets: newsAnalysis.assets,
        perAssetImpact: newsAnalysis.perAssetImpact,
      })
      .from(newsArticles)
      .innerJoin(newsAnalysis, eq(newsAnalysis.articleId, newsArticles.id))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(150)
  );

  const latestFeatureRow = await dbFirst<{ momentum: number | null; volatility: number | null; newsFeatures: string }>(
    db
      .select({ momentum: features.momentum, volatility: features.volatility, newsFeatures: features.newsFeatures })
      .from(features)
      .where(eq(features.asset, symbol))
      .orderBy(desc(features.timestamp))
      .limit(1)
  );
  let newsImpact1h: number | null = null;
  if (latestFeatureRow) {
    try {
      newsImpact1h = JSON.parse(latestFeatureRow.newsFeatures)?.["1h"]?.weightedSentiment ?? null;
    } catch {
      newsImpact1h = null;
    }
  }

  const news = newsRows
    .filter((r) => (JSON.parse(r.assets) as string[]).includes(symbol))
    .slice(0, 20)
    .map((r) => ({ ...r, assets: JSON.parse(r.assets), perAssetImpact: JSON.parse(r.perAssetImpact) }));

  return NextResponse.json({
    asset,
    priceHistory,
    predictionHistory1h,
    latestPredictions,
    news,
    momentum: latestFeatureRow?.momentum ?? null,
    volatility: latestFeatureRow?.volatility ?? null,
    newsImpact1h,
  });
}
