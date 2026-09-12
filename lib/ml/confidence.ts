import { ConfidenceLabel } from "@/lib/types";
import { NewsWindowFeatures } from "./news-features";
import { MarketFeatureSet } from "./market-features";
import { clamp } from "@/lib/util";

export interface ModelHistoricalStats {
  accuracy: number | null; // 0..1, null if insufficient history
  sampleSize: number;
}

/**
 * Confidence is deliberately separate from probability: a 72% probability
 * built on one thin article is LOW confidence; the same 72% built on
 * several important, fresh, mutually-agreeing articles plus a track record
 * is HIGH confidence.
 */
export function computeConfidence(
  news: NewsWindowFeatures,
  market: MarketFeatureSet,
  historical: ModelHistoricalStats
): { score: number; label: ConfidenceLabel } {
  const dataAvailability = market.currentPrice > 0 && market.priceChange1h !== null ? 1 : 0.4;
  const articleVolume = clamp(news.newsCount / 4, 0, 1);
  const importanceFactor = news.averageImportance;
  const noveltyFactor = news.averageNovelty;
  const modelTrackRecord = historical.sampleSize >= 20 && historical.accuracy !== null ? historical.accuracy : 0.5;

  // agreement between news sentiment and market momentum direction
  const newsDir = Math.sign(news.weightedSentiment);
  const marketDir = Math.sign(market.momentum ?? 0);
  const agreement = newsDir !== 0 && marketDir !== 0 ? (newsDir === marketDir ? 1 : 0.3) : 0.6;

  const score =
    0.2 * dataAvailability +
    0.2 * articleVolume +
    0.15 * importanceFactor +
    0.1 * noveltyFactor +
    0.2 * modelTrackRecord +
    0.15 * agreement;

  const clamped = clamp(score, 0, 1);
  const label: ConfidenceLabel = clamped >= 0.66 ? "HIGH" : clamped >= 0.4 ? "MEDIUM" : "LOW";
  return { score: Math.round(clamped * 100) / 100, label };
}
