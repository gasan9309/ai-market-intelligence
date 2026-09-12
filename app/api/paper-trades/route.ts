import { NextResponse } from "next/server";
import { listPaperTrades, openPaperTrade, getPortfolioSummary } from "@/lib/services/paper-trading";

export const dynamic = "force-dynamic";

export async function GET() {
  const [portfolio, trades] = await Promise.all([getPortfolioSummary(), listPaperTrades()]);
  return NextResponse.json({ portfolio, trades });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = await openPaperTrade(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
