import { db } from "@/lib/db/client";
import { predictions, predictionResults } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { Horizon } from "@/lib/types";
import { mean, stddev } from "@/lib/util";

export const MIN_SAMPLE_SIZE = 5;

export interface PerformanceMetrics {
  sampleSize: number;
  insufficientData: boolean;
  directionalAccuracy: number | null;
  precision: number | null;
  recall: number | null;
  averageReturnAfterSignal: number | null;
  winRate: number | null;
  maxDrawdown: number | null;
  profitFactor: number | null;
  sharpeRatio: number | null;
}

interface EvaluatedRow {
  probabilityUp: number;
  actualReturn: number;
  correctDirection: boolean;
}

async function fetchEvaluated(asset?: string, horizon?: Horizon, asOf?: Date): Promise<EvaluatedRow[]> {
  const conditions = [eq(predictionResults.status, "evaluated")];
  if (asset) conditions.push(eq(predictions.asset, asset));
  if (horizon) conditions.push(eq(predictions.horizon, horizon));
  // AUDIT FIX (item 7): when computing "historical" accuracy to feed into
  // a prediction's confidence score, only ever look at predictions that
  // were both made AND evaluated strictly before this prediction's own
  // asOf. Without this bound, re-generating or backfilling a prediction
  // for a past timestamp (e.g. during a data backfill) could leak
  // information from evaluations that, chronologically, had not happened
  // yet — a subtle look-ahead bias. Live/normal operation (asOf = now)
  // is unaffected since all existing evaluated rows are already in the
  // past relative to "now".
  if (asOf) conditions.push(lt(predictions.targetTimestamp, asOf));

  const rows = await dbAll<{ probabilityUp: number; actualReturn: number | null; correctDirection: boolean | null }>(
    db
      .select({
        probabilityUp: predictions.probabilityUp,
        actualReturn: predictionResults.actualReturn,
        correctDirection: predictionResults.correctDirection,
      })
      .from(predictionResults)
      .innerJoin(predictions, eq(predictions.id, predictionResults.predictionId))
      .where(and(...conditions))
  );

  return rows
    .filter((r) => r.actualReturn !== null && r.correctDirection !== null)
    .map((r) => ({ probabilityUp: r.probabilityUp, actualReturn: r.actualReturn as number, correctDirection: !!r.correctDirection }));
}

export async function getModelHistoricalStats(asset: string, horizon: Horizon, asOf?: Date): Promise<{ accuracy: number | null; sampleSize: number }> {
  const rows = await fetchEvaluated(asset, horizon, asOf);
  if (rows.length < MIN_SAMPLE_SIZE) return { accuracy: null, sampleSize: rows.length };
  return { accuracy: mean(rows.map((r) => (r.correctDirection ? 1 : 0))), sampleSize: rows.length };
}

export async function getPerformanceMetrics(asset?: string, horizon?: Horizon): Promise<PerformanceMetrics> {
  const rows = await fetchEvaluated(asset, horizon);
  const sampleSize = rows.length;

  if (sampleSize < MIN_SAMPLE_SIZE) {
    return {
      sampleSize,
      insufficientData: true,
      directionalAccuracy: null,
      precision: null,
      recall: null,
      averageReturnAfterSignal: null,
      winRate: null,
      maxDrawdown: null,
      profitFactor: null,
      sharpeRatio: null,
    };
  }

  const directionalAccuracy = mean(rows.map((r) => (r.correctDirection ? 1 : 0)));

  const predictedUp = rows.filter((r) => r.probabilityUp >= 0.5);
  const actualUp = rows.filter((r) => r.actualReturn > 0);
  const truePositives = rows.filter((r) => r.probabilityUp >= 0.5 && r.actualReturn > 0).length;
  const precision = predictedUp.length > 0 ? truePositives / predictedUp.length : null;
  const recall = actualUp.length > 0 ? truePositives / actualUp.length : null;

  const signedReturns = rows.map((r) => (r.probabilityUp >= 0.5 ? r.actualReturn : -r.actualReturn));
  const averageReturnAfterSignal = mean(signedReturns);
  const winRate = mean(signedReturns.map((r) => (r > 0 ? 1 : 0)));

  const gains = signedReturns.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const losses = Math.abs(signedReturns.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

  const sd = stddev(signedReturns);
  const sharpeRatio = sd > 0 ? mean(signedReturns) / sd : 0;

  let equity = 1;
  let peak = 1;
  let maxDD = 0;
  for (const r of signedReturns) {
    equity *= 1 + r;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, (peak - equity) / peak);
  }

  return {
    sampleSize,
    insufficientData: false,
    directionalAccuracy: round(directionalAccuracy),
    precision: precision !== null ? round(precision) : null,
    recall: recall !== null ? round(recall) : null,
    averageReturnAfterSignal: round(averageReturnAfterSignal),
    winRate: round(winRate),
    maxDrawdown: round(maxDD),
    profitFactor: isFinite(profitFactor) ? round(profitFactor) : null,
    sharpeRatio: round(sharpeRatio),
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
