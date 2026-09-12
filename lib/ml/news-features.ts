import { db } from "@/lib/db/client";
import { newsAnalysis, newsArticles } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { mean } from "@/lib/util";

export interface NewsWindowFeatures {
  newsCount: number;
  positiveNewsCount: number;
  negativeNewsCount: number;
  positiveNewsRatio: number;
  negativeNewsRatio: number;
  averageSentiment: number;
  weightedSentiment: number;
  averageImportance: number;
  averageNovelty: number;
  breakingNewsCount: number;
  assetSpecificNewsScore: number;
  sentimentChange: number; // weightedSentiment vs the immediately preceding window of the same size
  newsVelocity: number; // articles per hour in this window
  referencedArticleIds: string[];
}

export type NewsFeaturesByWindow = Record<"15m" | "1h" | "4h" | "24h", NewsWindowFeatures>;

const WINDOW_MS = { "15m": 15 * 60_000, "1h": 60 * 60_000, "4h": 4 * 60 * 60_000, "24h": 24 * 60 * 60_000 };

const EMPTY: NewsWindowFeatures = {
  newsCount: 0,
  positiveNewsCount: 0,
  negativeNewsCount: 0,
  positiveNewsRatio: 0,
  negativeNewsRatio: 0,
  averageSentiment: 0,
  weightedSentiment: 0,
  averageImportance: 0,
  averageNovelty: 0,
  breakingNewsCount: 0,
  assetSpecificNewsScore: 0,
  sentimentChange: 0,
  newsVelocity: 0,
  referencedArticleIds: [],
};

interface Row {
  articleId: string;
  assets: string;
  sentiment: number;
  importance: number;
  novelty: number;
  perAssetImpact: string;
  analyzedAt: Date;
  publishedAt: Date;
}

export async function computeNewsFeatures(asset: string, asOf: Date): Promise<NewsFeaturesByWindow> {
  // pull a 48h lookback so we can also compute the *preceding* window for
  // each bucket (needed for sentiment_change) without a second round trip
  const lookbackStart = new Date(asOf.getTime() - 2 * WINDOW_MS["24h"]);

  const rows = await dbAll<Row>(
    db
      .select({
        articleId: newsAnalysis.articleId,
        assets: newsAnalysis.assets,
        sentiment: newsAnalysis.sentiment,
        importance: newsAnalysis.importance,
        novelty: newsAnalysis.novelty,
        perAssetImpact: newsAnalysis.perAssetImpact,
        analyzedAt: newsAnalysis.analyzedAt,
        publishedAt: newsArticles.publishedAt,
      })
      .from(newsAnalysis)
      .innerJoin(newsArticles, eq(newsAnalysis.articleId, newsArticles.id))
      .where(and(gte(newsArticles.publishedAt, lookbackStart), lte(newsArticles.publishedAt, asOf)))
  );

  const relevant = rows.filter((r) => {
    try {
      return (JSON.parse(r.assets) as string[]).includes(asset);
    } catch {
      return false;
    }
  });

  function scoreWindow(inWindow: Row[], windowMs: number): NewsWindowFeatures | null {
    if (inWindow.length === 0) return null;

    const sentiments = inWindow.map((r) => r.sentiment);
    const perAssetScores = inWindow.map((r) => {
      try {
        const impact = JSON.parse(r.perAssetImpact)[asset];
        return impact?.impactScore ?? r.sentiment;
      } catch {
        return r.sentiment;
      }
    });

    const weights = inWindow.map((r) => {
      const ageFrac = 1 - (asOf.getTime() - r.publishedAt.getTime()) / windowMs;
      return Math.max(0.1, ageFrac) * (0.5 + r.importance);
    });
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const weightedSentiment = inWindow.reduce((acc, r, i) => acc + perAssetScores[i] * weights[i], 0) / weightSum;

    const positiveNewsCount = perAssetScores.filter((s) => s > 0.1).length;
    const negativeNewsCount = perAssetScores.filter((s) => s < -0.1).length;

    return {
      newsCount: inWindow.length,
      positiveNewsCount,
      negativeNewsCount,
      positiveNewsRatio: round2(positiveNewsCount / inWindow.length),
      negativeNewsRatio: round2(negativeNewsCount / inWindow.length),
      averageSentiment: round2(mean(sentiments)),
      weightedSentiment: round2(weightedSentiment),
      averageImportance: round2(mean(inWindow.map((r) => r.importance))),
      averageNovelty: round2(mean(inWindow.map((r) => r.novelty))),
      breakingNewsCount: inWindow.filter((r) => r.novelty > 0.75 && r.importance > 0.6).length,
      assetSpecificNewsScore: round2(mean(perAssetScores)),
      sentimentChange: 0, // filled in below once we have the preceding window
      newsVelocity: round2(inWindow.length / (windowMs / 3_600_000)),
      referencedArticleIds: inWindow
        .slice()
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, 5)
        .map((r) => r.articleId),
    };
  }

  const result = {} as NewsFeaturesByWindow;
  for (const [key, ms] of Object.entries(WINDOW_MS) as [keyof NewsFeaturesByWindow, number][]) {
    const windowStart = asOf.getTime() - ms;
    const prevWindowStart = asOf.getTime() - 2 * ms;

    const inWindow = relevant.filter((r) => r.publishedAt.getTime() >= windowStart);
    const inPrevWindow = relevant.filter(
      (r) => r.publishedAt.getTime() >= prevWindowStart && r.publishedAt.getTime() < windowStart
    );

    const current = scoreWindow(inWindow, ms);
    const previous = scoreWindow(inPrevWindow, ms);

    if (!current) {
      result[key] = { ...EMPTY };
      continue;
    }
    current.sentimentChange = round2(current.weightedSentiment - (previous?.weightedSentiment ?? 0));
    result[key] = current;
  }

  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
