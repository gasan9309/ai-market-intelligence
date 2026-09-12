/**
 * Standalone data-leakage verification (audit item: "verify no data
 * leakage"). Runs read-only queries against the current database and
 * asserts, over ALL rows (not a sample), that:
 *
 *   1. No prediction's feature_snapshot was taken AFTER its own
 *      prediction_timestamp (features must only reflect the past).
 *   2. No prediction_results row has a label (status="evaluated") while
 *      target_timestamp is still in the future relative to evaluated_at.
 *   3. No news_analysis references an article whose published_at is after
 *      the prediction that cites it (referenced_article_ids only contains
 *      articles published at-or-before prediction_timestamp).
 *   4. No news article's published_at is after its own retrieved_at.
 *
 * Exits non-zero if any violation is found. Forces DATABASE_MODE=sqlite
 * so it always checks the local demo/dev database unless overridden.
 *
 * Run with: npx tsx scripts/verify-no-leakage.ts
 */
if (!process.env.DATABASE_MODE) process.env.DATABASE_MODE = "sqlite";

import { db } from "../lib/db/client";
import { predictions, features, newsArticles, predictionResults } from "../lib/db/schema";
import { dbAll } from "../lib/db/query";
import { eq } from "drizzle-orm";

async function main() {
  let violations = 0;

  // 1. feature snapshot timestamp <= prediction timestamp
  const predRows = await dbAll<{
    id: string;
    predictionTimestamp: Date;
    featureSnapshotId: string;
    referencedArticleIds: string;
  }>(
    db.select({
      id: predictions.id,
      predictionTimestamp: predictions.predictionTimestamp,
      featureSnapshotId: predictions.featureSnapshotId,
      referencedArticleIds: predictions.referencedArticleIds,
    }).from(predictions)
  );
  const featureRows = await dbAll<{ id: string; timestamp: Date }>(
    db.select({ id: features.id, timestamp: features.timestamp }).from(features)
  );
  const featureById = new Map(featureRows.map((f) => [f.id, f]));

  for (const p of predRows) {
    const f = featureById.get(p.featureSnapshotId);
    if (!f) continue; // orphaned reference, not a leakage issue per se
    if (f.timestamp.getTime() > p.predictionTimestamp.getTime()) {
      violations++;
      console.error(
        `[LEAKAGE] prediction ${p.id}: feature snapshot timestamp ${f.timestamp.toISOString()} is AFTER prediction_timestamp ${p.predictionTimestamp.toISOString()}`
      );
    }
  }

  // 2. evaluated labels must never precede their own target_timestamp
  const predByIdMap = new Map(predRows.map((p) => [p.id, p]));
  const resultRows = await dbAll<{ predictionId: string; status: string; evaluatedAt: Date | null }>(
    db.select({ predictionId: predictionResults.predictionId, status: predictionResults.status, evaluatedAt: predictionResults.evaluatedAt }).from(predictionResults)
  );
  const targetById = await dbAll<{ id: string; targetTimestamp: Date }>(
    db.select({ id: predictions.id, targetTimestamp: predictions.targetTimestamp }).from(predictions)
  );
  const targetMap = new Map(targetById.map((t) => [t.id, t.targetTimestamp]));

  for (const r of resultRows) {
    if (r.status !== "evaluated" || !r.evaluatedAt) continue;
    const target = targetMap.get(r.predictionId);
    if (!target) continue;
    if (r.evaluatedAt.getTime() < target.getTime()) {
      violations++;
      console.error(
        `[LEAKAGE] prediction ${r.predictionId}: evaluated at ${r.evaluatedAt.toISOString()} which is BEFORE its target_timestamp ${target.toISOString()}`
      );
    }
  }

  // 3. referenced articles must be published at-or-before prediction_timestamp
  const articleRows = await dbAll<{ id: string; publishedAt: Date; retrievedAt: Date }>(
    db.select({ id: newsArticles.id, publishedAt: newsArticles.publishedAt, retrievedAt: newsArticles.retrievedAt }).from(newsArticles)
  );
  const articleById = new Map(articleRows.map((a) => [a.id, a]));

  for (const p of predRows) {
    let ids: string[] = [];
    try {
      ids = JSON.parse(p.referencedArticleIds);
    } catch {
      continue;
    }
    for (const id of ids) {
      const a = articleById.get(id);
      if (!a) continue;
      if (a.publishedAt.getTime() > p.predictionTimestamp.getTime()) {
        violations++;
        console.error(
          `[LEAKAGE] prediction ${p.id} references article ${id} published ${a.publishedAt.toISOString()} which is AFTER prediction_timestamp ${p.predictionTimestamp.toISOString()}`
        );
      }
    }
  }

  // 4. published_at must never be after retrieved_at
  for (const a of articleRows) {
    if (a.publishedAt.getTime() > a.retrievedAt.getTime() + 60_000) {
      violations++;
      console.error(`[LEAKAGE] article ${a.id}: published_at ${a.publishedAt.toISOString()} is AFTER retrieved_at ${a.retrievedAt.toISOString()}`);
    }
  }

  console.log(`Checked ${predRows.length} predictions, ${featureRows.length} feature snapshots, ${articleRows.length} articles, ${resultRows.length} results.`);
  if (violations === 0) {
    console.log("PASS: no data-leakage violations found.");
    process.exit(0);
  } else {
    console.error(`FAIL: ${violations} leakage violation(s) found.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
