import { db } from "@/lib/db/client";
import { newsArticles, newsAnalysis } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { MarketFeatureSet } from "./market-features";
import { NewsWindowFeatures } from "./news-features";
import { Horizon } from "@/lib/types";

export interface Explanation {
  drivers: string[];
  riskFactors: string[];
  referencedArticleIds: string[];
}

/**
 * Builds an explanation strictly from data already stored in the DB
 * (referenced articles + computed features) — never invents reasons.
 */
export async function buildExplanation(
  asset: string,
  horizon: Horizon,
  market: MarketFeatureSet,
  news: NewsWindowFeatures,
  probabilityUp: number
): Promise<Explanation> {
  const drivers: string[] = [];
  const risk: string[] = [];

  if (news.referencedArticleIds.length > 0) {
    const articles = await dbAll<{ id: string; title: string; source: string }>(
      db
        .select({ id: newsArticles.id, title: newsArticles.title, source: newsArticles.source })
        .from(newsArticles)
        .where(inArray(newsArticles.id, news.referencedArticleIds))
    );
    const byId = new Map(articles.map((a) => [a.id, a]));

    for (const id of news.referencedArticleIds.slice(0, 3)) {
      const a = byId.get(id);
      if (a) {
        const tone = news.weightedSentiment > 0 ? "supportive of upside" : news.weightedSentiment < 0 ? "supportive of downside" : "mixed";
        drivers.push(`"${a.title}" (${a.source}) — ${tone}`);
      }
    }
  } else {
    risk.push("No recent asset-specific news in this window — signal is driven mainly by price action.");
  }

  if (market.momentum !== null && Math.abs(market.momentum) > 0.001) {
    drivers.push(`${asset} short-term momentum is ${market.momentum > 0 ? "positive" : "negative"}.`);
  }
  if (news.weightedSentiment !== 0 && news.newsCount > 0) {
    drivers.push(
      `Recent news sentiment is ${news.weightedSentiment > 0.15 ? "strongly positive" : news.weightedSentiment > 0 ? "mildly positive" : news.weightedSentiment < -0.15 ? "strongly negative" : "mildly negative"} (avg importance ${(news.averageImportance * 100).toFixed(0)}%).`
    );
  }
  if (market.volatility !== null && market.volatility > 0.01) {
    risk.push("Volatility remains elevated, widening the range of likely outcomes.");
  }
  if (news.newsCount < 2) {
    risk.push("Signal is based on a limited number of recent news events.");
  }
  if (news.breakingNewsCount > 0) {
    drivers.push(`${news.breakingNewsCount} high-importance/novel news event(s) in this window.`);
  }
  if (drivers.length === 0) {
    drivers.push("No strong directional signal from news or price action — leaning toward the model's neutral prior.");
  }
  if (Math.abs(probabilityUp - 0.5) < 0.05) {
    risk.push("Probability is close to 50% — treat this as a low-conviction/neutral read.");
  }

  return { drivers, riskFactors: risk, referencedArticleIds: news.referencedArticleIds };
}
