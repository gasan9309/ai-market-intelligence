import { db } from "@/lib/db/client";
import { features, predictions, predictionResults, modelVersions } from "@/lib/db/schema";
import { dbAll, dbRun } from "@/lib/db/query";
import { eq } from "drizzle-orm";
import { ASSETS, MODEL_VERSION, resolveMode } from "@/lib/config";
import { HORIZONS, HORIZON_MS } from "@/lib/types";
import { computeMarketFeatures } from "@/lib/ml/market-features";
import { computeNewsFeatures } from "@/lib/ml/news-features";
import { runBaselinePrediction } from "@/lib/ml/prediction-engine";
import { classifySignal } from "@/lib/ml/signal";
import { computeConfidence } from "@/lib/ml/confidence";
import { buildExplanation } from "@/lib/ml/explanation";
import { getModelHistoricalStats } from "./performance";
import { newId } from "@/lib/util";
import { log } from "./logger";

// BASELINE = hand-set heuristic weights, never fit on real historical
// outcomes. This status must never be flipped to TRAINED by this file —
// only an explicit, separate training step (not yet implemented) may do
// that, and only using real (non-demo) evaluated data.
const MODEL_STATUS = "BASELINE" as const;
const MODEL_DESCRIPTION =
  "UNTRAINED BASELINE — transparent linear combination of momentum, recent price change, weighted news sentiment, importance and volatility, passed through a sigmoid (logistic-regression-shaped). Hand-set weights, not fit on any real historical outcomes.";

async function ensureModelVersion() {
  const existing = await dbAll(db.select().from(modelVersions).where(eq(modelVersions.version, MODEL_VERSION)));
  if (existing.length === 0) {
    await dbRun(
      db.insert(modelVersions).values({
        version: MODEL_VERSION,
        description: MODEL_DESCRIPTION,
        status: MODEL_STATUS,
        createdAt: new Date(),
      })
    );
  }
}

export async function generatePredictions(asOf: Date = new Date()): Promise<{ generated: number }> {
  await ensureModelVersion();
  const mode = resolveMode();
  let generated = 0;

  for (const asset of ASSETS) {
    const market = await computeMarketFeatures(asset.symbol, asOf);
    if (market.currentPrice <= 0) {
      log("warn", "prediction", `Skipping ${asset.symbol} — no market data yet.`);
      continue;
    }
    const newsByWindow = await computeNewsFeatures(asset.symbol, asOf);

    const featureSnapshotId = newId("feat");
    await dbRun(
      db.insert(features).values({
        id: featureSnapshotId,
        asset: asset.symbol,
        timestamp: asOf,
        currentPrice: market.currentPrice,
        priceChange5m: market.priceChange5m,
        priceChange15m: market.priceChange15m,
        priceChange1h: market.priceChange1h,
        priceChange4h: market.priceChange4h,
        priceChange24h: market.priceChange24h,
        volumeChange: market.volumeChange,
        volatility: market.volatility,
        momentum: market.momentum,
        newsFeatures: JSON.stringify(newsByWindow),
      })
    );

    for (const horizon of HORIZONS) {
      try {
        const { probabilityUp, modelVersion } = runBaselinePrediction({ horizon, market, newsByWindow });
        const signal = classifySignal(probabilityUp);
        const newsForHorizon = newsByWindow[horizon];
        const historical = await getModelHistoricalStats(asset.symbol, horizon, asOf);
        const confidence = computeConfidence(newsForHorizon, market, historical);
        const explanation = await buildExplanation(asset.symbol, horizon, market, newsForHorizon, probabilityUp);

        const predictionId = newId("pred");
        const targetTimestamp = new Date(asOf.getTime() + HORIZON_MS[horizon]);

        await dbRun(
          db.insert(predictions).values({
            id: predictionId,
            asset: asset.symbol,
            horizon,
            probabilityUp,
            signal,
            confidenceScore: confidence.score,
            confidenceLabel: confidence.label,
            modelVersion,
            featureSnapshotId,
            priceAtPrediction: market.currentPrice,
            explanationDrivers: JSON.stringify(explanation.drivers),
            riskFactors: JSON.stringify(explanation.riskFactors),
            referencedArticleIds: JSON.stringify(explanation.referencedArticleIds),
            predictionTimestamp: asOf,
            targetTimestamp,
            mode,
          })
        );

        await dbRun(db.insert(predictionResults).values({ predictionId, status: "pending" }));

        generated++;
      } catch (err) {
        log("error", "prediction", `Failed generating ${asset.symbol}/${horizon}`, { error: String(err) });
      }
    }
  }

  return { generated };
}
