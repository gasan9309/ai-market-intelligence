import { db } from "@/lib/db/client";
import { paperTrades, marketSnapshots } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { dbAll, dbFirst, dbRun } from "@/lib/db/query";
import { newId } from "@/lib/util";

export const PAPER_STARTING_CAPITAL = 10_000;

export interface OpenTradeInput {
  asset: string;
  direction: "long" | "short";
  size: number; // dollar amount
  stopPrice?: number;
  targetPrice?: number;
  predictionId?: string;
}

async function latestPrice(asset: string): Promise<number | null> {
  const row = await dbFirst<{ price: number }>(
    db.select().from(marketSnapshots).where(eq(marketSnapshots.asset, asset)).orderBy(desc(marketSnapshots.timestamp)).limit(1)
  );
  return row?.price ?? null;
}

export async function openPaperTrade(input: OpenTradeInput): Promise<string> {
  const price = await latestPrice(input.asset);
  if (!price) throw new Error(`No current price available for ${input.asset}`);

  const id = newId("trade");
  await dbRun(
    db.insert(paperTrades).values({
      id,
      asset: input.asset,
      direction: input.direction,
      entryPrice: price,
      stopPrice: input.stopPrice ?? null,
      targetPrice: input.targetPrice ?? null,
      size: input.size,
      status: "open",
      predictionId: input.predictionId ?? null,
      openedAt: new Date(),
    })
  );
  return id;
}

export async function closePaperTrade(id: string): Promise<void> {
  const trade = await dbFirst<{ id: string; asset: string; direction: string; entryPrice: number; size: number; feesPct: number; slippagePct: number }>(
    db.select().from(paperTrades).where(eq(paperTrades.id, id))
  );
  if (!trade) throw new Error("Trade not found");
  const price = (await latestPrice(trade.asset)) ?? trade.entryPrice;
  const pnl = computePnl(trade.direction, trade.entryPrice, price, trade.size, trade.feesPct, trade.slippagePct);

  await dbRun(
    db
      .update(paperTrades)
      .set({ status: pnl >= 0 ? "closed_win" : "closed_loss", closedAt: new Date(), closePrice: price, pnl })
      .where(eq(paperTrades.id, id))
  );
}

function computePnl(direction: string, entry: number, current: number, size: number, feesPct = 0, slippagePct = 0): number {
  const pctMove = (current - entry) / entry;
  const signedPct = direction === "long" ? pctMove : -pctMove;
  // Round-trip costs (entry + exit) modeled as a flat drag on the position,
  // so paper P&L isn't unrealistically clean compared to a real fill.
  const costPct = 2 * (feesPct + slippagePct);
  return Math.round(size * (signedPct - costPct) * 100) / 100;
}

export async function listPaperTrades() {
  const trades = await dbAll<{
    id: string;
    asset: string;
    direction: string;
    entryPrice: number;
    stopPrice: number | null;
    targetPrice: number | null;
    size: number;
    feesPct: number;
    slippagePct: number;
    status: string;
    predictionId: string | null;
    openedAt: Date;
    closedAt: Date | null;
    closePrice: number | null;
    pnl: number | null;
  }>(db.select().from(paperTrades).orderBy(desc(paperTrades.openedAt)));

  return Promise.all(
    trades.map(async (t) => {
      const currentPrice = (await latestPrice(t.asset)) ?? t.entryPrice;
      const livePnl = t.status === "open" ? computePnl(t.direction, t.entryPrice, currentPrice, t.size, t.feesPct, t.slippagePct) : t.pnl;
      return { ...t, currentPrice, livePnl };
    })
  );
}

export async function getPortfolioSummary() {
  const trades = await listPaperTrades();
  const realizedPnl = trades.filter((t) => t.status !== "open").reduce((a, t) => a + (t.pnl ?? 0), 0);
  const unrealizedPnl = trades.filter((t) => t.status === "open").reduce((a, t) => a + (t.livePnl ?? 0), 0);
  return {
    startingCapital: PAPER_STARTING_CAPITAL,
    equity: PAPER_STARTING_CAPITAL + realizedPnl + unrealizedPnl,
    realizedPnl: Math.round(realizedPnl * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    openPositions: trades.filter((t) => t.status === "open").length,
  };
}
