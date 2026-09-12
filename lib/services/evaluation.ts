import { db } from "@/lib/db/client";
import { predictions, predictionResults, marketSnapshots } from "@/lib/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { dbAll, dbRun } from "@/lib/db/query";
import { log } from "./logger";

interface DueRow {
  predictionId: string;
  asset: string;
  probabilityUp: number;
  priceAtPrediction: number;
  predictionTimestamp: Date;
  targetTimestamp: Date;
}

/**
 * Finds predictions whose target horizon has passed and are still
 * "pending", looks up the actual price at (or nearest after) the target
 * timestamp, and records the outcome — the label. This function is the
 * ONLY place labels are ever written, and it only ever runs on predictions
 * whose target_timestamp <= asOf (enforced by the query below), so a label
 * can never exist before its horizon has actually passed. Evaluation only
 * ever looks *forward* from prediction_timestamp to target_timestamp —
 * never at information from after target_timestamp.
 */
export async function runEvaluation(asOf: Date = new Date()): Promise<{ evaluated: number; stillPending: number }> {
  const due = await dbAll<DueRow>(
    db
      .select({
        predictionId: predictions.id,
        asset: predictions.asset,
        probabilityUp: predictions.probabilityUp,
        priceAtPrediction: predictions.priceAtPrediction,
        predictionTimestamp: predictions.predictionTimestamp,
        targetTimestamp: predictions.targetTimestamp,
      })
      .from(predictions)
      .innerJoin(predictionResults, eq(predictionResults.predictionId, predictions.id))
      .where(and(eq(predictionResults.status, "pending"), lte(predictions.targetTimestamp, asOf)))
  );

  let evaluated = 0;

  for (const p of due) {
    const tolerance = 20 * 60_000; // 20 min tolerance for nearest snapshot to the target timestamp

    // Snapshots across the WHOLE prediction window (entry -> target) are
    // needed for MFE/MAE. This range is bounded by target_timestamp, which
    // we've already confirmed is <= asOf — so nothing beyond the labeled
    // horizon is ever read here.
    const windowSnaps = await dbAll<{ price: number; timestamp: Date }>(
      db
        .select({ price: marketSnapshots.price, timestamp: marketSnapshots.timestamp })
        .from(marketSnapshots)
        .where(
          and(
            eq(marketSnapshots.asset, p.asset),
            gte(marketSnapshots.timestamp, p.predictionTimestamp),
            lte(marketSnapshots.timestamp, new Date(p.targetTimestamp.getTime() + tolerance))
          )
        )
        .orderBy(asc(marketSnapshots.timestamp))
    );

    const snap = windowSnaps
      .filter((s) => Math.abs(s.timestamp.getTime() - p.targetTimestamp.getTime()) <= tolerance)
      .sort(
        (a, b) =>
          Math.abs(a.timestamp.getTime() - p.targetTimestamp.getTime()) -
          Math.abs(b.timestamp.getTime() - p.targetTimestamp.getTime())
      )[0];

    if (!snap) continue; // not enough data yet at that point in time — leave pending

    const actualReturn = (snap.price - p.priceAtPrediction) / p.priceAtPrediction;
    const predictedUp = p.probabilityUp >= 0.5;
    const actuallyUp = actualReturn > 0;
    const correctDirection = predictedUp === actuallyUp;
    const predictionError = Math.abs(p.probabilityUp - (actuallyUp ? 1 : 0));
    const absoluteReturn = Math.abs(actualReturn);

    // MFE/MAE relative to the predicted direction, using only snapshots
    // within [prediction_timestamp, target_timestamp].
    let maximumFavorableMove = 0;
    let maximumAdverseMove = 0;
    for (const s of windowSnaps) {
      if (s.timestamp.getTime() > p.targetTimestamp.getTime() + tolerance) continue;
      const move = (s.price - p.priceAtPrediction) / p.priceAtPrediction;
      const directional = predictedUp ? move : -move;
      if (directional > maximumFavorableMove) maximumFavorableMove = directional;
      if (directional < maximumAdverseMove) maximumAdverseMove = directional;
    }

    await dbRun(
      db
        .update(predictionResults)
        .set({
          actualPrice: snap.price,
          actualReturn,
          correctDirection,
          predictionError,
          absoluteReturn,
          maximumFavorableMove: round4(maximumFavorableMove),
          maximumAdverseMove: round4(maximumAdverseMove),
          evaluatedAt: asOf,
          status: "evaluated",
        })
        .where(eq(predictionResults.predictionId, p.predictionId))
    );

    evaluated++;
  }

  if (evaluated > 0) log("info", "evaluation", `Evaluated ${evaluated} predictions`);

  return { evaluated, stillPending: due.length - evaluated };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
