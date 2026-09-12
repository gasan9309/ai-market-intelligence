CREATE TABLE IF NOT EXISTS assets (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  display_symbol TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  retrieved_at INTEGER NOT NULL,
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
  sentiment REAL NOT NULL,
  importance REAL NOT NULL,
  novelty REAL NOT NULL,
  time_horizon TEXT NOT NULL,
  impact TEXT NOT NULL,
  confidence REAL NOT NULL,
  reason TEXT NOT NULL,
  per_asset_impact TEXT NOT NULL,
  analyzer_version TEXT NOT NULL,
  analyzed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_analysis_asset ON news_analysis(asset);
CREATE INDEX IF NOT EXISTS idx_news_analysis_article ON news_analysis(article_id);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  price REAL NOT NULL,
  volume REAL,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_asset_ts ON market_snapshots(asset, timestamp);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  current_price REAL NOT NULL,
  price_change_5m REAL,
  price_change_15m REAL,
  price_change_1h REAL,
  price_change_4h REAL,
  price_change_24h REAL,
  volume_change REAL,
  volatility REAL,
  momentum REAL,
  news_features TEXT NOT NULL,
  dxy_value REAL,
  dxy_change REAL,
  vix_value REAL,
  vix_change REAL,
  us10y_value REAL,
  us10y_change REAL,
  btc_eth_ratio REAL
);
CREATE INDEX IF NOT EXISTS idx_features_asset_ts ON features(asset, timestamp);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  horizon TEXT NOT NULL,
  probability_up REAL NOT NULL,
  signal TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  confidence_label TEXT NOT NULL,
  model_version TEXT NOT NULL,
  feature_snapshot_id TEXT NOT NULL,
  price_at_prediction REAL NOT NULL,
  explanation_drivers TEXT NOT NULL,
  risk_factors TEXT NOT NULL,
  referenced_article_ids TEXT NOT NULL,
  prediction_timestamp INTEGER NOT NULL,
  target_timestamp INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'demo'
);
CREATE INDEX IF NOT EXISTS idx_predictions_asset_horizon ON predictions(asset, horizon, prediction_timestamp);
CREATE INDEX IF NOT EXISTS idx_predictions_target_ts ON predictions(target_timestamp);

CREATE TABLE IF NOT EXISTS prediction_results (
  prediction_id TEXT PRIMARY KEY,
  actual_price REAL,
  actual_return REAL,
  correct_direction INTEGER,
  prediction_error REAL,
  absolute_return REAL,
  maximum_favorable_move REAL,
  maximum_adverse_move REAL,
  evaluated_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS model_versions (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BASELINE',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS backtests (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  horizon TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  probability_threshold REAL NOT NULL,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  scope TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_system_logs_ts ON system_logs(timestamp);

CREATE TABLE IF NOT EXISTS paper_trades (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price REAL NOT NULL,
  stop_price REAL,
  target_price REAL,
  size REAL NOT NULL,
  fees_pct REAL NOT NULL DEFAULT 0.001,
  slippage_pct REAL NOT NULL DEFAULT 0.0005,
  status TEXT NOT NULL DEFAULT 'open',
  prediction_id TEXT,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  close_price REAL,
  pnl REAL
);

CREATE TABLE IF NOT EXISTS macro_snapshots (
  id TEXT PRIMARY KEY,
  series TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_macro_snapshots_series_ts ON macro_snapshots(series, timestamp);
