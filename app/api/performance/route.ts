import { NextResponse } from "next/server";
import { getPerformanceMetrics } from "@/lib/services/performance";
import { ASSETS } from "@/lib/config";
import { HORIZONS, Horizon } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assetFilter = searchParams.get("asset") || undefined;
  const horizonFilter = (searchParams.get("horizon") as Horizon) || undefined;

  const assetsToRun = assetFilter ? ASSETS.filter((a) => a.symbol === assetFilter) : ASSETS;
  const horizonsToRun = horizonFilter ? [horizonFilter] : HORIZONS;

  const matrix = await Promise.all(
    assetsToRun.map(async (asset) => {
      const byHorizon: Record<string, Awaited<ReturnType<typeof getPerformanceMetrics>>> = {};
      for (const h of horizonsToRun) {
        byHorizon[h] = await getPerformanceMetrics(asset.symbol, h);
      }
      return { asset: asset.symbol, displaySymbol: asset.displaySymbol, byHorizon };
    })
  );

  return NextResponse.json({ matrix });
}
