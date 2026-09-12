import { db } from "@/lib/db/client";
import { newsArticles, newsAnalysis, marketSnapshots, predictions, predictionResults, systemLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { dbAll } from "@/lib/db/query";
import { ASSETS } from "@/lib/config";
import { HORIZONS } from "@/lib/types";

export interface DataQualityBucket {
  mode: "demo" | "real"; // "real" = live + data_collection combined
  newsArticles: number;
  analyzedNews: number;
  marketSnapshots: number;
  predictions: number;
  evaluatedPredictions: number;
}

export interface DataQualityReport {
  buckets: DataQualityBucket[];
  duplicateNewsBlocked: number;
  failedProviderRequests: number;
  failedAiAnalyses: number;
  lastNewsIngestion: string | null;
  lastMarketIngestion: string | null;
  realSamplesByHorizon: Record<string, number>;
}

function isDemoProvider(provider: string): boolean {
  return provider === "demo" || provider.startsWith("demo-");
}

export async function getDataQualityReport(): Promise<DataQualityReport> {
  const [articleRows, analysisCount, snapshotRows, predictionRows, resultRows, logRows] = await Promise.all([
    dbAll<{ provider: string }>(db.select({ provider: newsArticles.provider }).from(newsArticles)),
    dbAll<{ articleId: string }>(db.select({ articleId: newsAnalysis.articleId }).from(newsAnalysis)),
    dbAll<{ mode: string }>(db.select({ mode: marketSnapshots.mode }).from(marketSnapshots)),
    dbAll<{ id: string; mode: string; horizon: string }>(db.select({ id: predictions.id, mode: predictions.mode, horizon: predictions.horizon }).from(predictions)),
    dbAll<{ predictionId: string; status: string }>(db.select({ predictionId: predictionResults.predictionId, status: predictionResults.status }).from(predictionResults)),
    dbAll<{ level: string; scope: string; message: string; meta: string | null }>(
      db.select({ level: systemLogs.level, scope: systemLogs.scope, message: systemLogs.message, meta: systemLogs.meta }).from(systemLogs)
    ),
  ]);

  // News articles: bucket by provider (demo-seed/demo vs anything else)
  const demoArticleCount = articleRows.filter((a) => isDemoProvider(a.provider)).length;
  const realArticleCount = articleRows.length - demoArticleCount;

  // We don't tag news_analysis rows with mode directly, but every analysis
  // row belongs to exactly one article, and article count already splits
  // demo/real above — analysis count is reported as a single total since
  // splitting it further would require an extra join for a number that's
  // not decision-relevant here (analysis rate, not analysis realness).
  const analyzedNewsTotal = analysisCount.length;

  const demoSnapshots = snapshotRows.filter((s) => s.mode === "demo").length;
  const realSnapshots = snapshotRows.length - demoSnapshots;

  const demoPredictionIds = new Set(predictionRows.filter((p) => p.mode === "demo").map((p) => p.id));
  const realPredictionIds = new Set(predictionRows.filter((p) => p.mode !== "demo").map((p) => p.id));

  const evaluatedIds = new Set(resultRows.filter((r) => r.status === "evaluated").map((r) => r.predictionId));
  const demoEvaluated = [...demoPredictionIds].filter((id) => evaluatedIds.has(id)).length;
  const realEvaluated = [...realPredictionIds].filter((id) => evaluatedIds.has(id)).length;

  const buckets: DataQualityBucket[] = [
    {
      mode: "demo",
      newsArticles: demoArticleCount,
      analyzedNews: demoArticleCount > 0 ? Math.round((analyzedNewsTotal * demoArticleCount) / Math.max(1, articleRows.length)) : 0,
      marketSnapshots: demoSnapshots,
      predictions: demoPredictionIds.size,
      evaluatedPredictions: demoEvaluated,
    },
    {
      mode: "real",
      newsArticles: realArticleCount,
      analyzedNews: realArticleCount > 0 ? Math.round((analyzedNewsTotal * realArticleCount) / Math.max(1, articleRows.length)) : 0,
      marketSnapshots: realSnapshots,
      predictions: realPredictionIds.size,
      evaluatedPredictions: realEvaluated,
    },
  ];

  // Duplicate/failure counts are derived from ingestion summaries already
  // logged by runIngestion/runMarketSync (see lib/services/logger.ts) —
  // reused here rather than tracked in a second place.
  let duplicateNewsBlocked = 0;
  for (const l of logRows) {
    if (l.scope === "news_ingestion" && l.meta) {
      try {
        const meta = JSON.parse(l.meta);
        if (typeof meta.duplicates === "number") duplicateNewsBlocked += meta.duplicates;
      } catch {
        /* ignore unparsable meta */
      }
    }
  }

  const failedProviderRequests = logRows.filter((l) => l.level === "error" && (l.scope === "market_sync" || l.scope === "news_ingestion" || l.scope === "macro_sync")).length;
  const failedAiAnalyses = logRows.filter((l) => l.level === "error" && l.scope === "ai_analysis").length;

  const lastNews = await dbAll<{ retrievedAt: Date }>(db.select({ retrievedAt: newsArticles.retrievedAt }).from(newsArticles).orderBy(desc(newsArticles.retrievedAt)).limit(1));
  const lastMarket = await dbAll<{ timestamp: Date }>(db.select({ timestamp: marketSnapshots.timestamp }).from(marketSnapshots).orderBy(desc(marketSnapshots.timestamp)).limit(1));

  const realSamplesByHorizon: Record<string, number> = {};
  for (const h of HORIZONS) {
    const idsForHorizon = new Set(predictionRows.filter((p) => p.mode !== "demo" && p.horizon === h).map((p) => p.id));
    realSamplesByHorizon[h] = [...idsForHorizon].filter((id) => evaluatedIds.has(id)).length;
  }

  return {
    buckets,
    duplicateNewsBlocked,
    failedProviderRequests,
    failedAiAnalyses,
    lastNewsIngestion: lastNews[0]?.retrievedAt.toISOString() ?? null,
    lastMarketIngestion: lastMarket[0]?.timestamp.toISOString() ?? null,
    realSamplesByHorizon,
  };
}
