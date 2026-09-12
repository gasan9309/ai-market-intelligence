import { NextResponse } from "next/server";
import { runBacktest } from "@/lib/services/backtest";
import { Horizon } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asset, horizon, startDate, endDate, probabilityThreshold } = body as {
      asset: string;
      horizon: Horizon;
      startDate: string;
      endDate: string;
      probabilityThreshold: number;
    };

    if (!asset || !horizon || !startDate || !endDate || typeof probabilityThreshold !== "number") {
      return NextResponse.json({ error: "Missing required backtest parameters" }, { status: 400 });
    }

    const result = await runBacktest({
      asset,
      horizon,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      probabilityThreshold,
    });

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/backtest] failed:", err);
    return NextResponse.json({ error: "Backtest failed", detail: String(err) }, { status: 500 });
  }
}
