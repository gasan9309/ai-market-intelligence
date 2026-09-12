import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Schema is written against the SQLite dialect for local/demo use.
 * The table/column shapes map 1:1 onto the Postgres schema described in
 * README.md ("Database setup"). To move to Postgres for production:
 *   1. swap the `better-sqlite3` driver for `postgres.js` / `pg` in lib/db/client.ts
 *   2. re-declare these tables with `drizzle-orm/pg-core` using the same
 *      names/columns (a `pg` version is provided in lib/db/schema.pg.ts)
 *   3. run `drizzle-kit push` against DATABASE_URL
 */

export const assets = sqliteTable("assets", {
  symbol: text("symbol").primaryKey(), // e.g. "BTC", "EUR/USD"
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(), // crypto | fx | equity_index | commodity
  displaySymbol: text("display_symbol").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const newsArticles = sqliteTable("news_articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  source: text("source").notNull(),
  url: text("url").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  retrievedAt: integer("retrieved_at", { mode: "timestamp_ms" }).notNull(),
  language: text("language").notNull().default("en"),
  rawText: text("raw_text"),
  hash: text("hash").notNull().unique(),
  provider: text("provider").notNull(), // demo | newsapi | rss:<feed>
});

export const newsAnalysis = sqliteTable("news_analysis", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull(),
  asset: text("asset").notNull(), // primary asset
  assets: text("assets").notNull(), // JSON array string
  eventType: text("event_type").notNull(),
  sentiment: real("sentiment").notNull(), // -1..1
  importance: real("importance").notNull(), // 0..1
  novelty: real("novelty").notNull(), // 0..1
  timeHorizon: text("time_horizon").notNull(), // short_term | medium_term | long_term
  impact: text("impact").notNull(), // positive | negative | neutral | mixed
  confidence: real("confidence").notNull(), // 0..1
  reason: text("reason").notNull(),
  perAssetImpact: text("per_asset_impact").notNull(), // JSON: {asset: {direction, impact_score, confidence}}
  analyzerVersion: text("analyzer_version").notNull(),
  analyzedAt: integer("analyzed_at", { mode: "timestamp_ms" }).notNull(),
});

export const marketSnapshots = sqliteTable("market_snapshots", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  price: real("price").notNull(),
  volume: real("volume"),
  source: text("source").notNull(), // demo | coingecko | alphavantage | ...
  mode: text("mode").notNull(), // live | demo
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
});

export const features = sqliteTable("features", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  // market features
  currentPrice: real("current_price").notNull(),
  priceChange5m: real("price_change_5m"),
  priceChange15m: real("price_change_15m"),
  priceChange1h: real("price_change_1h"),
  priceChange4h: real("price_change_4h"),
  priceChange24h: real("price_change_24h"),
  volumeChange: real("volume_change"),
  volatility: real("volatility"),
  momentum: real("momentum"),
  // news features (JSON keyed by window: 15m/1h/4h/24h)
  newsFeatures: text("news_features").notNull(),
  // Phase 2 macro context features (nullable — populated only once a macro
  // snapshot exists close enough in time; never fabricated).
  dxyValue: real("dxy_value"),
  dxyChange: real("dxy_change"),
  vixValue: real("vix_value"),
  vixChange: real("vix_change"),
  us10yValue: real("us10y_value"),
  us10yChange: real("us10y_change"),
  btcEthRatio: real("btc_eth_ratio"),
});

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  horizon: text("horizon").notNull(), // 15m | 1h | 4h | 24h
  probabilityUp: real("probability_up").notNull(),
  signal: text("signal").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  confidenceLabel: text("confidence_label").notNull(), // LOW | MEDIUM | HIGH
  modelVersion: text("model_version").notNull(),
  featureSnapshotId: text("feature_snapshot_id").notNull(),
  priceAtPrediction: real("price_at_prediction").notNull(),
  explanationDrivers: text("explanation_drivers").notNull(), // JSON string[]
  riskFactors: text("risk_factors").notNull(), // JSON string[]
  referencedArticleIds: text("referenced_article_ids").notNull(), // JSON string[]
  predictionTimestamp: integer("prediction_timestamp", { mode: "timestamp_ms" }).notNull(),
  targetTimestamp: integer("target_timestamp", { mode: "timestamp_ms" }).notNull(),
  // live | demo | data_collection — stamped from resolveMode() at
  // generation time. This is what lets model-readiness/training queries
  // honestly exclude synthetic demo data (spec: "DEMO DATA MUST NEVER
  // COUNT TOWARD REAL ML TRAINING READINESS").
  mode: text("mode").notNull().default("demo"),
});

export const predictionResults = sqliteTable("prediction_results", {
  predictionId: text("prediction_id").primaryKey(),
  actualPrice: real("actual_price"),
  actualReturn: real("actual_return"),
  correctDirection: integer("correct_direction", { mode: "boolean" }),
  predictionError: real("prediction_error"),
  // Phase 2 label-generation fields (spec section 10). All null until the
  // horizon has passed and evaluation runs — never populated in advance.
  absoluteReturn: real("absolute_return"),
  maximumFavorableMove: real("maximum_favorable_move"), // best unrealized move in the predicted direction
  maximumAdverseMove: real("maximum_adverse_move"), // worst unrealized move against the predicted direction
  evaluatedAt: integer("evaluated_at", { mode: "timestamp_ms" }),
  status: text("status").notNull().default("pending"), // pending | evaluated
});

export const modelVersions = sqliteTable("model_versions", {
  version: text("version").primaryKey(),
  description: text("description").notNull(),
  // BASELINE = hand-set heuristic weights, not fit on real outcomes.
  // TRAINED = fit on real (non-demo) labeled prediction_results via a
  // chronological train/val/test split. Never set to TRAINED automatically.
  status: text("status").notNull().default("BASELINE"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const backtests = sqliteTable("backtests", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  horizon: text("horizon").notNull(),
  startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
  probabilityThreshold: real("probability_threshold").notNull(),
  resultJson: text("result_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const systemLogs = sqliteTable("system_logs", {
  id: text("id").primaryKey(),
  level: text("level").notNull(), // info | warn | error
  scope: text("scope").notNull(), // news_ingestion | ai_analysis | prediction | market_sync | api_error
  message: text("message").notNull(),
  meta: text("meta"), // JSON string
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
});

export const paperTrades = sqliteTable("paper_trades", {
  id: text("id").primaryKey(),
  asset: text("asset").notNull(),
  direction: text("direction").notNull(), // long | short
  entryPrice: real("entry_price").notNull(),
  stopPrice: real("stop_price"),
  targetPrice: real("target_price"),
  size: real("size").notNull(),
  feesPct: real("fees_pct").notNull().default(0.001), // 0.1% per side, configurable
  slippagePct: real("slippage_pct").notNull().default(0.0005), // 0.05%, configurable
  status: text("status").notNull().default("open"), // open | closed_win | closed_loss | closed_manual
  predictionId: text("prediction_id"),
  openedAt: integer("opened_at", { mode: "timestamp_ms" }).notNull(),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  closePrice: real("close_price"),
  pnl: real("pnl"),
});

export const macroSnapshots = sqliteTable("macro_snapshots", {
  id: text("id").primaryKey(),
  series: text("series").notNull(), // DXY | VIX | US10Y
  value: real("value").notNull(),
  source: text("source").notNull(), // demo | fred | alphavantage
  mode: text("mode").notNull(), // live | demo | data_collection
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
});
