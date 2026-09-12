import { NextResponse } from "next/server";
import { getDataQualityReport } from "@/lib/services/data-quality";
import { getAllModelReadiness } from "@/lib/services/model-readiness";
import { ASSETS } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const [report, readinessByAsset] = await Promise.all([
    getDataQualityReport(),
    Promise.all(ASSETS.map(async (a) => ({ asset: a.symbol, displaySymbol: a.displaySymbol, readiness: await getAllModelReadiness(a.symbol) }))),
  ]);

  return NextResponse.json({ report, readinessByAsset });
}
