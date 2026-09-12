import { pgTable, text, boolean, real, timestamp } from "drizzle-orm/pg-core";

/**
 * PRODUCTION (Postgres) variant of lib/db/schema.ts.
 * Not wired up by default (this sandbox has no Postgres access), but kept
 * 1:1 with the SQLite schema so switching is mechanical. To activate:
 *   1. `npm install pg` (or `postgres`)
 *   2. point lib/db/client.ts at this file + a Postgres driver instead of
 *      better-sqlite3, driven by DATABASE_URL
 *   3. `npx drizzle-kit push` against your Supabase/Neon DATABASE_URL
 *
 * Column names/types intentionally mirror schema.ts so application code in
 * lib/services and lib/ml does not need to change.
 */

export const assets = pgTable("assets", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(),
  displaySymbol: text("display_symbol").notNull(),
  active: boolean("active").notNull().default(true),
});

export const newsArticles = pgTable("news_articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  source: text("source").notNull(),
  url: text("url").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }).notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true, mode: "date" }).notNull(),
  language: text("language").notNull().default("en"),
  rawText: text("raw_text"),
  hash: text("hash").notNull().unique(),
  provider: text("provider").notNull(),
});

export const newsAnalysis = pgTable("news_analysis", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull(),
  asset: text("asset").notNull(),
  assets: text("assets").notNull(),
  eventType: text("event_type").notNull(),
  sentiment: real("sentiment").notNull(),
  importance: real("importance").notNull(),
  novelty: real("novelty").notNull(),
  timeHorizon: text("time_horizon").notNull(),
  impact: text("impact").notNull(),
  confidence: real("confidence").notNull(),
  reason: text("reason").notNull(),
  perAssetImpact: text("per_asset_impact").notNull(),
  analyzerVersion: text("analyzer_version").notNull(),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const marketSnapshots = pgTable("market_snapshots", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  price: real("price").notNull(),
  volume: real("volume"),
  source: text("source").notNull(),
  mode: text("mode").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).notNull(),
});

export const features = pgTable("features", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).notNull(),
  currentPrice: real("current_price").notNull(),
  priceChange5m: real("price_change_5m"),
  priceChange15m: real("price_change_15m"),
  priceChange1h: real("price_change_1h"),
  priceChange4h: real("price_change_4h"),
  priceChange24h: real("price_change_24h"),
  volumeChange: real("volume_change"),
  volatility: real("volatility"),
  momentum: real("momentum"),
  newsFeatures: text("news_features").notNull(),
  dxyValue: real("dxy_value"),
  dxyChange: real("dxy_change"),
  vixValue: real("vix_value"),
  vixChange: real("vix_change"),
  us10yValue: real("us10y_value"),
  us10yChange: real("us10y_change"),
  btcEthRatio: real("btc_eth_ratio"),
});

export const predictions = pgTable("predictions", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  horizon: text("horizon").notNull(),
  probabilityUp: real("probability_up").notNull(),
  signal: text("signal").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  confidenceLabel: text("confidence_label").notNull(),
  modelVersion: text("model_version").notNull(),
  featureSnapshotId: text("feature_snapshot_id").notNull(),
  priceAtPrediction: real("price_at_prediction").notNull(),
  explanationDrivers: text("explanation_drivers").notNull(),
  riskFactors: text("risk_factors").notNull(),
  referencedArticleIds: text("referenced_article_ids").notNull(),
  predictionTimestamp: timestamp("prediction_timestamp", { withTimezone: true, mode: "date" }).notNull(),
  targetTimestamp: timestamp("target_timestamp", { withTimezone: true, mode: "date" }).notNull(),
  mode: text("mode").notNull().default("demo"),
});

export const predictionResults = pgTable("prediction_results", {
  predictionId: text("prediction_id").primaryKey(),
  actualPrice: real("actual_price"),
  actualReturn: real("actual_return"),
  correctDirection: boolean("correct_direction"),
  predictionError: real("prediction_error"),
  absoluteReturn: real("absolute_return"),
  maximumFavorableMove: real("maximum_favorable_move"),
  maximumAdverseMove: real("maximum_adverse_move"),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true, mode: "date" }),
  status: text("status").notNull().default("pending"),
});

export const modelVersions = pgTable("model_versions", {
  version: text("version").primaryKey(),
  description: text("description").notNull(),
  status: text("status").notNull().default("BASELINE"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const backtests = pgTable("backtests", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  horizon: text("horizon").notNull(),
  startDate: timestamp("start_date", { withTimezone: true, mode: "date" }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true, mode: "date" }).notNull(),
  probabilityThreshold: real("probability_threshold").notNull(),
  resultJson: text("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: text("id").primaryKey(),
  level: text("level").notNull(),
  scope: text("scope").notNull(),
  message: text("message").notNull(),
  meta: text("meta"),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).notNull(),
});

export const paperTrades = pgTable("paper_trades", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  direction: text("direction").notNull(),
  entryPrice: real("entry_price").notNull(),
  stopPrice: real("stop_price"),
  targetPrice: real("target_price"),
  size: real("size").notNull(),
  feesPct: real("fees_pct").notNull().default(0.001),
  slippagePct: real("slippage_pct").notNull().default(0.0005),
  status: text("status").notNull().default("open"),
  predictionId: text("prediction_id"),
  openedAt: timestamp("opened_at", { withTimezone: true, mode: "date" }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
  closePrice: real("close_price"),
  pnl: real("pnl"),
});

export const macroSnapshots = pgTable("macro_snapshots", {
  id: text("id").primaryKey(),
  series: text("series").notNull(),
  value: real("value").notNull(),
  source: text("source").notNull(),
  mode: text("mode").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).notNull(),
});
