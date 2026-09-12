import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/services/ingestion";
import { runMarketSync } from "@/lib/services/market-sync";
import { generatePredictions } from "@/lib/services/prediction-service";
import { runEvaluation } from "@/lib/services/evaluation";
import { tryAcquireIngestionLock } from "@/lib/services/ingestion-lock";
import { resolveMode } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * AUDIT FIX (item 3): this endpoint actually does work (external API
 * calls in live mode, DB writes always) and must not be triggerable by
 * arbitrary callers.
 *
 * - If CRON_SECRET is set, every request must present it, either as
 *   `Authorization: Bearer <secret>` (the header Vercel Cron sends
 *   automatically when a cron job is configured with that env var) or as
 *   `x-cron-secret: <secret>` (for manual/curl testing).
 * - If CRON_SECRET is NOT set: requests are only allowed while the system
 *   is in DEMO MODE, where this route makes zero external calls and only
 *   generates local synthetic data (needed so the demo dashboard's
 *   client-side auto-refresh keeps working with no server secret
 *   available to the browser). LIVE or DATA COLLECTION mode without a
 *   configured CRON_SECRET is rejected outright — operators must set the
 *   secret before going live. See README "Securing /api/ingest".
 */
function isAuthorized(req: Request, mode: string): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    return authHeader === `Bearer ${secret}` || cronHeader === secret;
  }
  return mode === "demo";
}

async function handle(req: Request) {
  const mode = resolveMode();

  if (!isAuthorized(req, mode)) {
    return NextResponse.json(
      {
        error:
          mode === "demo"
            ? "Unauthorized"
            : "Unauthorized — CRON_SECRET must be configured to run ingestion outside demo mode.",
      },
      { status: 401 }
    );
  }

  // AUDIT FIX (item 13): reject a second trigger arriving too soon after
  // the last one, rather than doing (and potentially paying for, in live
  // mode) redundant work.
  const lock = await tryAcquireIngestionLock();
  if (!lock.acquired) {
    return NextResponse.json(
      { skipped: true, reason: "Ingestion tick already ran recently.", lastStartedAt: lock.lastStartedAt?.toISOString() ?? null },
      { status: 429 }
    );
  }

  try {
    const market = await runMarketSync();
    const news = await runIngestion();
    const predictions = await generatePredictions();
    const evaluation = await runEvaluation();

    return NextResponse.json({
      mode,
      timestamp: new Date().toISOString(),
      market,
      news,
      predictions,
      evaluation,
    });
  } catch (err) {
    console.error("[/api/ingest] failed:", err);
    return NextResponse.json({ error: "Ingestion tick failed", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
