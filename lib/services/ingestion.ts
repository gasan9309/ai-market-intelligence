import { db } from "@/lib/db/client";
import { newsArticles, newsAnalysis } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { dbAll, dbRun } from "@/lib/db/query";
import { getNewsProviders } from "@/lib/providers/news";
import { getAIAnalyzer } from "@/lib/ai";
import { isFinanciallyRelevant, isSupportedLanguage } from "@/lib/ai/relevance";
import { hashText, newId } from "@/lib/util";
import { log } from "./logger";
import { resolveMode } from "@/lib/config";

export interface IngestionSummary {
  fetched: number;
  duplicates: number;
  filteredOut: number;
  rejectedTimestamp: number;
  analyzed: number;
  errors: number;
}

export async function runIngestion(): Promise<IngestionSummary> {
  const mode = resolveMode();
  const providers = getNewsProviders();
  const analyzer = getAIAnalyzer();
  const summary: IngestionSummary = {
    fetched: 0,
    duplicates: 0,
    filteredOut: 0,
    rejectedTimestamp: 0,
    analyzed: 0,
    errors: 0,
  };

  for (const provider of providers) {
    let articles;
    try {
      articles = await provider.fetchLatest();
    } catch (err) {
      log("error", "news_ingestion", `Provider ${provider.name} fetch failed`, { error: String(err) });
      summary.errors++;
      continue;
    }

    summary.fetched += articles.length;

    for (const article of articles) {
      const retrievedAt = new Date();

      // Guard against publication timestamps that would leak future
      // information: publishedAt must never be after the moment we
      // retrieved the article. A provider bug or clock skew producing a
      // "future" publish date is rejected rather than silently accepted.
      if (article.publishedAt.getTime() > retrievedAt.getTime() + 60_000) {
        summary.rejectedTimestamp++;
        log("warn", "news_ingestion", `Rejected article with future publishedAt`, {
          title: article.title,
          publishedAt: article.publishedAt.toISOString(),
        });
        continue;
      }

      const hash = hashText(`${article.title.trim().toLowerCase()}|${article.url}`);

      const existing = await dbAll<{ id: string }>(
        db.select({ id: newsArticles.id }).from(newsArticles).where(eq(newsArticles.hash, hash))
      );
      if (existing.length > 0) {
        summary.duplicates++;
        continue;
      }

      if (!isSupportedLanguage(article.language) || !isFinanciallyRelevant(article.title, article.description)) {
        summary.filteredOut++;
        continue;
      }

      const id = newId("news");
      try {
        await dbRun(
          db.insert(newsArticles).values({
            id,
            title: article.title,
            description: article.description,
            source: article.source,
            url: article.url,
            publishedAt: article.publishedAt,
            retrievedAt,
            language: article.language,
            rawText: article.rawText ?? null,
            hash,
            provider: article.provider,
          })
        );
      } catch (err) {
        // unique constraint race or similar — treat as duplicate
        summary.duplicates++;
        continue;
      }

      try {
        const analysis = await analyzer.analyze({ ...article, id });
        await dbRun(
          db.insert(newsAnalysis).values({
            id: newId("analysis"),
            articleId: id,
            asset: analysis.asset,
            assets: JSON.stringify(analysis.assets),
            eventType: analysis.eventType,
            sentiment: analysis.sentiment,
            importance: analysis.importance,
            novelty: analysis.novelty,
            timeHorizon: analysis.timeHorizon,
            impact: analysis.impact,
            confidence: analysis.confidence,
            reason: analysis.reason,
            perAssetImpact: JSON.stringify(analysis.perAssetImpact),
            analyzerVersion: analysis.analyzerVersion,
            analyzedAt: new Date(),
          })
        );
        summary.analyzed++;
      } catch (err) {
        log("error", "ai_analysis", `Analysis failed for article ${id}`, { error: String(err) });
        summary.errors++;
      }
    }
  }

  log("info", "news_ingestion", `Ingestion complete (mode=${mode})`, summary);
  return summary;
}
