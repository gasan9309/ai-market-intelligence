import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { newsArticles, newsAnalysis } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const asset = searchParams.get("asset");

  const rows = await dbAll<{
    id: string;
    title: string;
    description: string | null;
    source: string;
    url: string;
    publishedAt: Date;
    eventType: string;
    sentiment: number;
    importance: number;
    novelty: number;
    assets: string;
    perAssetImpact: string;
    reason: string;
  }>(
    db
      .select({
        id: newsArticles.id,
        title: newsArticles.title,
        description: newsArticles.description,
        source: newsArticles.source,
        url: newsArticles.url,
        publishedAt: newsArticles.publishedAt,
        eventType: newsAnalysis.eventType,
        sentiment: newsAnalysis.sentiment,
        importance: newsAnalysis.importance,
        novelty: newsAnalysis.novelty,
        assets: newsAnalysis.assets,
        perAssetImpact: newsAnalysis.perAssetImpact,
        reason: newsAnalysis.reason,
      })
      .from(newsArticles)
      .innerJoin(newsAnalysis, eq(newsAnalysis.articleId, newsArticles.id))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(200)
  );

  const parsed = rows.map((r) => ({
    ...r,
    assets: JSON.parse(r.assets) as string[],
    perAssetImpact: JSON.parse(r.perAssetImpact),
  }));

  const filtered = asset ? parsed.filter((r) => r.assets.includes(asset)) : parsed;

  return NextResponse.json({ items: filtered.slice(0, limit) });
}
