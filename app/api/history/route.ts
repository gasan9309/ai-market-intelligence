import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { predictions, predictionResults } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { Horizon } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get("asset") || undefined;
  const horizon = (searchParams.get("horizon") as Horizon) || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 300);

  const conditions = [];
  if (asset) conditions.push(eq(predictions.asset, asset));
  if (horizon) conditions.push(eq(predictions.horizon, horizon));

  const rows = await dbAll(
    db
      .select({
        id: predictions.id,
        asset: predictions.asset,
        horizon: predictions.horizon,
        probabilityUp: predictions.probabilityUp,
        signal: predictions.signal,
        confidenceLabel: predictions.confidenceLabel,
        priceAtPrediction: predictions.priceAtPrediction,
        predictionTimestamp: predictions.predictionTimestamp,
        targetTimestamp: predictions.targetTimestamp,
        status: predictionResults.status,
        actualPrice: predictionResults.actualPrice,
        actualReturn: predictionResults.actualReturn,
        correctDirection: predictionResults.correctDirection,
      })
      .from(predictions)
      .innerJoin(predictionResults, eq(predictionResults.predictionId, predictions.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(predictions.predictionTimestamp))
      .limit(limit)
  );

  return NextResponse.json({ items: rows });
}
