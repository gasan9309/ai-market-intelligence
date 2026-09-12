CREATE TABLE IF NOT EXISTS assets (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  display_symbol TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  raw_text TEXT,
  hash TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);

CREATE TABLE IF NOT EXISTS news_analysis (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  assets TEXT NOT NULL,
  event_type TEXT NOT NULL,
  sentiment DOUBLE PRECISION NOT NULL,
  importance DOUBLE PRECISION NOT NULL,
  novelty DOUBLE PRECISION NOT NULL,
  time_horizon TEXT NOT NULL,
  impact TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  per_asset_impact TEXT NOT NULL,
  analyzer_version TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_analysis_asset ON news_analysis(asset);
CREATE INDEX IF NOT EXISTS idx_news_analysis_article ON news_analysis(article_id);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_asset_ts ON market_snapshots(asset, timestamp);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  current_price DOUBLE PRECISION NOT NULL,
  price_change_5m DOUBLE PRECISION,
  price_change_15m DOUBLE PRECISION,
  price_change_1h DOUBLE PRECISION,
  price_change_4h DOUBLE PRECISION,
  price_change_24h DOUBLE PRECISION,
  volume_change DOUBLE PRECISION,
  volatility DOUBLE PRECISION,
  momentum DOUBLE PRECISION,
  news_features TEXT NOT NULL,
  dxy_value DOUBLE PRECISION,
  dxy_change DOUBLE PRECISION,
  vix_value DOUBLE PRECISION,
  vix_change DOUBLE PRECISION,
  us10y_value DOUBLE PRECISION,
  us10y_change DOUBLE PRECISION,
  btc_eth_ratio DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_features_asset_ts ON features(asset, timestamp);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  horizon TEXT NOT NULL,
  probability_up DOUBLE PRECISION NOT NULL,
  signal TEXT NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  confidence_label TEXT NOT NULL,
  model_version TEXT NOT NULL,
  feature_snapshot_id TEXT NOT NULL,
  price_at_prediction DOUBLE PRECISION NOT NULL,
  explanation_drivers TEXT NOT NULL,
  risk_factors TEXT NOT NULL,
  referenced_article_ids TEXT NOT NULL,
  prediction_timestamp TIMESTAMPTZ NOT NULL,
  target_timestamp TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL DEFAULT 'demo'
);
CREATE INDEX IF NOT EXISTS idx_predictions_asset_horizon ON predictions(asset, horizon, prediction_timestamp);
CREATE INDEX IF NOT EXISTS idx_predictions_target_ts ON predictions(target_timestamp);

CREATE TABLE IF NOT EXISTS prediction_results (
  prediction_id TEXT PRIMARY KEY,
  actual_price DOUBLE PRECISION,
  actual_return DOUBLE PRECISION,
  correct_direction BOOLEAN,
  prediction_error DOUBLE PRECISION,
  absolute_return DOUBLE PRECISION,
  maximum_favorable_move DOUBLE PRECISION,
  maximum_adverse_move DOUBLE PRECISION,
  evaluated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS model_versions (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BASELINE',
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS backtests (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  horizon TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  probability_threshold DOUBLE PRECISION NOT NULL,
  result_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  scope TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  timestamp TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_system_logs_ts ON system_logs(timestamp);

CREATE TABLE IF NOT EXISTS paper_trades (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DOUBLE PRECISION NOT NULL,
  stop_price DOUBLE PRECISION,
  target_price DOUBLE PRECISION,
  size DOUBLE PRECISION NOT NULL,
  fees_pct DOUBLE PRECISION NOT NULL DEFAULT 0.001,
  slippage_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0005,
  status TEXT NOT NULL DEFAULT 'open',
  prediction_id TEXT,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  close_price DOUBLE PRECISION,
  pnl DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS macro_snapshots (
  id TEXT PRIMARY KEY,
  series TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_macro_snapshots_series_ts ON macro_snapshots(series, timestamp);

-- Idempotent column additions for schemas migrated before these columns
-- existed (CREATE TABLE IF NOT EXISTS above is a no-op on tables that
-- already exist, so new columns need to be added explicitly here).
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE prediction_results ADD COLUMN IF NOT EXISTS absolute_return DOUBLE PRECISION;
ALTER TABLE prediction_results ADD COLUMN IF NOT EXISTS maximum_favorable_move DOUBLE PRECISION;
ALTER TABLE prediction_results ADD COLUMN IF NOT EXISTS maximum_adverse_move DOUBLE PRECISION;
ALTER TABLE model_versions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'BASELINE';
ALTER TABLE paper_trades ADD COLUMN IF NOT EXISTS fees_pct DOUBLE PRECISION NOT NULL DEFAULT 0.001;
ALTER TABLE paper_trades ADD COLUMN IF NOT EXISTS slippage_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0005;
ALTER TABLE features ADD COLUMN IF NOT EXISTS dxy_value DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN IF NOT EXISTS dxy_change DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN IF NOT EXISTS vix_value DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN IF NOT EXISTS vix_change DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN IF NOT EXISTS us10y_value DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN IF NOT EXISTS us10y_change DOUBLE PRECISION;
ALTER TABLE features ADD COLUMN IF NOT EXISTS btc_eth_ratio DOUBLE PRECISION;
