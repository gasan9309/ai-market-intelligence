/**
 * Seeds DEMO MODE with historical market snapshots, news + analysis, and
 * predictions/prediction_results spanning the past few days, so the
 * dashboard, Model Performance, and Backtesting pages have real (demo)
 * data to show immediately instead of empty states.
 *
 * AUDIT FIX (items 4, 14): this script generates synthetic, random-walk
 * demo data. It must never accidentally run against a real Postgres/
 * production database, and this data must never be used to train the
 * prediction model. Both env vars are forced here, before lib/db/client is
 * first imported, so nothing else in the codebase can override them for
 * this process.
 *
 * Run with: npm run db:seed
 */
process.env.MODE = "demo";
process.env.DATABASE_MODE = "sqlite";

import { db } from "../lib/db/client";
import { assets, marketSnapshots, newsArticles, newsAnalysis } from "../lib/db/schema";
import { dbAll, dbRun } from "../lib/db/query";
import { eq } from "drizzle-orm";
import { ASSETS } from "../lib/config";
import { HEADLINE_POOL } from "../lib/providers/news/headline-pool";
import { DemoAIAnalyzer } from "../lib/ai/demo-analyzer";
import { generatePredictions } from "../lib/services/prediction-service";
import { runEvaluation } from "../lib/services/evaluation";
import { hashText, newId } from "../lib/util";

const SEED_PRICES: Record<string, number> = { BTC: 96_500, ETH: 3_350, EURUSD: 1.071, SPY: 540.0, GOLD: 2_480 };
const VOL: Record<string, number> = { BTC: 0.0025, ETH: 0.0032, EURUSD: 0.0006, SPY: 0.0009, GOLD: 0.0008 };

const DAYS_BACK = 3;
const STEP_MINUTES = 15;

async function main() {
  console.log(`Seeding ${DAYS_BACK} days of DEMO-ONLY synthetic history (SQLite) at ${STEP_MINUTES}-minute resolution...`);
  console.log("This data is a random walk + seeded headlines — NOT suitable for model training (see README).");

  // 1. asset registry
  for (const a of ASSETS) {
    const existing = await dbAll(db.select().from(assets).where(eq(assets.symbol, a.symbol)));
    if (existing.length === 0) {
      await dbRun(
        db.insert(assets).values({ symbol: a.symbol, name: a.name, assetClass: a.assetClass, displaySymbol: a.displaySymbol, active: true })
      );
    }
  }

  const analyzer = new DemoAIAnalyzer();
  const now = new Date();
  const start = new Date(now.getTime() - DAYS_BACK * 24 * 60 * 60_000);
  const stepMs = STEP_MINUTES * 60_000;

  const lastPrice: Record<string, number> = { ...SEED_PRICES };
  let newsCounter = 0;
  let step = 0;
  const totalSteps = Math.floor((now.getTime() - start.getTime()) / stepMs);

  for (let t = start.getTime(); t <= now.getTime(); t += stepMs) {
    const ts = new Date(t);
    step++;

    // --- market snapshots (random walk per asset) ---
    for (const a of ASSETS) {
      const vol = VOL[a.symbol] ?? 0.001;
      const noise = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const price = Math.max(0.0001, lastPrice[a.symbol] * (1 + noise * vol));
      lastPrice[a.symbol] = price;

      await dbRun(
        db.insert(marketSnapshots).values({
          id: newId("snap"),
          asset: a.symbol,
          price: round(price, a.symbol),
          volume: 1_000_000 * (0.6 + Math.random() * 0.8),
          source: "demo-seed",
          mode: "demo",
          timestamp: ts,
        })
      );
    }

    // --- occasional news (roughly every ~45-90 min of sim time) ---
    if (step % 4 === 0 && Math.random() < 0.7) {
      const count = 1 + Math.floor(Math.random() * 2);
      const picks = shuffle(HEADLINE_POOL).slice(0, count);
      for (const h of picks) {
        newsCounter++;
        const publishedAt = new Date(t - Math.floor(Math.random() * 5 * 60_000));
        const url = `https://example-demo-feed.local/${encodeURIComponent(h.title)}-${publishedAt.getTime()}-${newsCounter}`;
        const hash = hashText(`${h.title.trim().toLowerCase()}|${url}`);
        const id = newId("news");

        await dbRun(
          db.insert(newsArticles).values({
            id,
            title: h.title,
            description: h.description,
            source: h.source,
            url,
            publishedAt,
            retrievedAt: publishedAt,
            language: "en",
            rawText: h.description,
            hash,
            provider: "demo-seed",
          })
        );

        const analysis = await analyzer.analyze({
          id,
          title: h.title,
          description: h.description,
          source: h.source,
          url,
          publishedAt,
          language: "en",
          rawText: h.description,
          provider: "demo-seed",
        });

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
            analyzedAt: publishedAt,
          })
        );
      }
    }

    // --- predictions at this point in simulated time ---
    await generatePredictions(ts);

    if (step % 40 === 0) console.log(`  ...${step}/${totalSteps} steps (${ts.toISOString()})`);
  }

  console.log("Running evaluation pass over historical predictions...");
  const evalRound = await runEvaluation(now);
  console.log(`  evaluated ${evalRound.evaluated}, still pending ${evalRound.stillPending}`);

  console.log(`Seed complete. Inserted ~${newsCounter} news articles, ${totalSteps} market ticks per asset.`);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function round(price: number, symbol: string): number {
  const decimals = symbol === "EURUSD" ? 4 : 2;
  const factor = 10 ** decimals;
  return Math.round(price * factor) / factor;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
