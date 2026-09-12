import { Horizon } from "@/lib/types";
import { MarketFeatureSet } from "./market-features";
import { NewsWindowFeatures } from "./news-features";
import { clamp, sigmoid } from "@/lib/util";
import { MODEL_VERSION } from "@/lib/config";

/**
 * BASELINE PREDICTION MODEL (MVP)
 * ---------------------------------------------------------------------
 * This is intentionally a transparent logistic-regression-*shaped* model:
 *   P(up) = sigmoid( w0 + w1*x1 + w2*x2 + ... )
 * exactly like the "Recommended: Logistic Regression" baseline the spec
 * asks for. The weights below are hand-set (not yet fit on labeled
 * history) because there is no historical outcome dataset on day one.
 *
 * The architecture is built so this can be swapped for a *fitted* model
 * without touching any caller: once prediction_results accumulates enough
 * evaluated rows (see lib/services/evaluation.ts), a real logistic
 * regression (or XGBoost) can be trained offline on
 * (feature snapshot -> correct_direction) pairs and its coefficients
 * substituted here, or this function replaced by a call to a trained
 * model service. Every prediction stores its feature_snapshot_id and
 * model_version specifically so that retraining/backtesting stays
 * reproducible.
 */

const HORIZON_WEIGHTS: Record<Horizon, { newsWindow: keyof NewsWindowFeaturesInput; momentumWeight: number; newsWeight: number; volWeight: number }> = {
  "15m": { newsWindow: "15m", momentumWeight: 1.4, newsWeight: 0.9, volWeight: -0.4 },
  "1h": { newsWindow: "1h", momentumWeight: 1.0, newsWeight: 1.2, volWeight: -0.3 },
  "4h": { newsWindow: "4h", momentumWeight: 0.6, newsWeight: 1.4, volWeight: -0.2 },
  "24h": { newsWindow: "24h", momentumWeight: 0.35, newsWeight: 1.5, volWeight: -0.15 },
};

type NewsWindowFeaturesInput = Record<"15m" | "1h" | "4h" | "24h", NewsWindowFeatures>;

export interface PredictionInput {
  horizon: Horizon;
  market: MarketFeatureSet;
  newsByWindow: NewsWindowFeaturesInput;
}

export interface PredictionOutput {
  probabilityUp: number;
  modelVersion: string;
  contributions: { label: string; value: number }[];
}

export function runBaselinePrediction(input: PredictionInput): PredictionOutput {
  const cfg = HORIZON_WEIGHTS[input.horizon];
  const news = input.newsByWindow[cfg.newsWindow as "15m" | "1h" | "4h" | "24h"];

  const momentumTerm = (input.market.momentum ?? 0) * 15 * cfg.momentumWeight; // scale pct -> logit-ish units
  const shortChangeTerm = (input.market.priceChange15m ?? 0) * 8 * 0.5;
  const newsTerm = news.weightedSentiment * cfg.newsWeight;
  const volatilityTerm = (input.market.volatility ?? 0) * 20 * cfg.volWeight;
  const importanceScaledNews = news.assetSpecificNewsScore * news.averageImportance * 0.6;

  const bias = 0; // centered at 50/50 with no information
  const logit = bias + momentumTerm + shortChangeTerm + newsTerm + volatilityTerm + importanceScaledNews;

  const probabilityUp = clamp(sigmoid(logit), 0.02, 0.98);

  return {
    probabilityUp: Math.round(probabilityUp * 1000) / 1000,
    modelVersion: MODEL_VERSION,
    contributions: [
      { label: "Price momentum", value: round(momentumTerm) },
      { label: "Recent price move", value: round(shortChangeTerm) },
      { label: "News sentiment (weighted)", value: round(newsTerm) },
      { label: "Volatility (dampening)", value: round(volatilityTerm) },
      { label: "News importance x relevance", value: round(importanceScaledNews) },
    ],
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
