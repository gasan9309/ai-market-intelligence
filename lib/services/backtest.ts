import { db } from "@/lib/db/client";
import { predictions, predictionResults, backtests } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { dbAll, dbRun } from "@/lib/db/query";
import { Horizon } from "@/lib/types";
import { mean, newId } from "@/lib/util";

// Configurable defaults, mirroring the per-trade costs paper trading uses
// (lib/db/schema: paper_trades.fees_pct / slippage_pct default the same).
// Applied as a round-trip drag (entry + exit) on every signal, exactly
// like a real fill would incur — never hidden from the reported numbers.
export const DEFAULT_FEES_PCT = 0.001; // 0.10% per side
export const DEFAULT_SLIPPAGE_PCT = 0.0005; // 0.05% per side

export interface BacktestParams {
  asset: string;
  horizon: Horizon;
  startDate: Date;
  endDate: Date;
  probabilityThreshold: number; // e.g. 0.65 -> longs at >=0.65, shorts at <=0.35
  feesPct?: number;
  slippagePct?: number;
}

export interface BacktestResult {
  numberOfSignals: number;
  winRate: number | null;
  // Gross = raw price-move return, before any trading cost.
  averageReturnGross: number | null;
  cumulativeReturnGross: number | null;
  // Net = after round-trip fees + slippage. This is the honest number to
  // judge a strategy by — gross is shown for comparison only, never alone.
  averageReturnNet: number | null;
  cumulativeReturnNet: number | null;
  maxDrawdownNet: number | null;
  feesPct: number;
  slippagePct: number;
  insufficientData: boolean;
  note?: string;
}

/**
 * Leakage/bias notes (spec audit item 8):
 * - Only reads predictions whose prediction_results.status = "evaluated" —
 *   those rows are only ever written by runEvaluation() after
 *   target_timestamp has passed (see evaluation.ts), so no row used here
 *   can reflect information from beyond its own labeled horizon.
 * - actualReturn is the label computed once, at evaluation time, from the
 *   real subsequent price — this function never re-derives it from a wider
 *   window, so there's no path for future data to leak in through here.
 * - No survivorship bias: the asset universe is a fixed, hardcoded list
 *   (lib/config.ts) that is never filtered by "did well" after the fact.
 * - Known, accepted limitation (not a bug): trying several probability
 *   thresholds after seeing results is a form of selection bias inherent
 *   to any interactive backtest UI. This tool does not correct for it —
 *   documented in README as a caveat for interpreting results.
 */
export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  const feesPct = params.feesPct ?? DEFAULT_FEES_PCT;
  const slippagePct = params.slippagePct ?? DEFAULT_SLIPPAGE_PCT;
  const roundTripCost = 2 * (feesPct + slippagePct);

  const rows = await dbAll<{ probabilityUp: number; predictionTimestamp: Date; actualReturn: number | null; status: string }>(
    db
      .select({
        probabilityUp: predictions.probabilityUp,
        predictionTimestamp: predictions.predictionTimestamp,
        actualReturn: predictionResults.actualReturn,
        status: predictionResults.status,
      })
      .from(predictions)
      .innerJoin(predictionResults, eq(predictionResults.predictionId, predictions.id))
      .where(
        and(
          eq(predictions.asset, params.asset),
          eq(predictions.horizon, params.horizon),
          gte(predictions.predictionTimestamp, params.startDate),
          lte(predictions.predictionTimestamp, params.endDate)
        )
      )
  );

  const evaluated = rows.filter((r) => r.status === "evaluated" && r.actualReturn !== null);
  const signals = evaluated.filter(
    (r) => r.probabilityUp >= params.probabilityThreshold || r.probabilityUp <= 1 - params.probabilityThreshold
  );

  if (signals.length < 3) {
    const result: BacktestResult = {
      numberOfSignals: signals.length,
      winRate: null,
      averageReturnGross: null,
      cumulativeReturnGross: null,
      averageReturnNet: null,
      cumulativeReturnNet: null,
      maxDrawdownNet: null,
      feesPct,
      slippagePct,
      insufficientData: true,
      note: "Insufficient evaluated predictions in this range/threshold to report reliable backtest metrics.",
    };
    await persist(params, result);
    return result;
  }

  const grossReturns = signals.map((r) => (r.probabilityUp >= 0.5 ? r.actualReturn! : -r.actualReturn!));
  const netReturns = grossReturns.map((r) => r - roundTripCost);

  const winRate = mean(netReturns.map((r) => (r > 0 ? 1 : 0))); // win = profitable AFTER costs

  let equityGross = 1;
  for (const r of grossReturns) equityGross *= 1 + r;

  let equityNet = 1;
  let peakNet = 1;
  let maxDD = 0;
  for (const r of netReturns) {
    equityNet *= 1 + r;
    peakNet = Math.max(peakNet, equityNet);
    maxDD = Math.max(maxDD, (peakNet - equityNet) / peakNet);
  }

  const result: BacktestResult = {
    numberOfSignals: signals.length,
    winRate: round(winRate),
    averageReturnGross: round(mean(grossReturns)),
    cumulativeReturnGross: round(equityGross - 1),
    averageReturnNet: round(mean(netReturns)),
    cumulativeReturnNet: round(equityNet - 1),
    maxDrawdownNet: round(maxDD),
    feesPct,
    slippagePct,
    insufficientData: false,
  };
  await persist(params, result);
  return result;
}

async function persist(params: BacktestParams, result: BacktestResult) {
  await dbRun(
    db.insert(backtests).values({
      id: newId("bt"),
      asset: params.asset,
      horizon: params.horizon,
      startDate: params.startDate,
      endDate: params.endDate,
      probabilityThreshold: params.probabilityThreshold,
      resultJson: JSON.stringify(result),
      createdAt: new Date(),
    })
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
