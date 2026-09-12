export type AssetSymbol = "BTC" | "ETH" | "EURUSD" | "SPY" | "GOLD";

export interface AssetDef {
  symbol: AssetSymbol;
  name: string;
  assetClass: "crypto" | "fx" | "equity_index" | "commodity";
  displaySymbol: string; // e.g. "BTC/USD"
}

export type Horizon = "15m" | "1h" | "4h" | "24h";

export const HORIZONS: Horizon[] = ["15m", "1h", "4h", "24h"];

export const HORIZON_MS: Record<Horizon, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

export type EventType =
  | "monetary_policy"
  | "inflation"
  | "employment"
  | "interest_rates"
  | "regulation"
  | "geopolitical"
  | "earnings"
  | "etf"
  | "crypto_flows"
  | "market_structure"
  | "economic_growth"
  | "banking"
  | "commodity"
  | "oil"
  | "currency"
  | "technology"
  | "other";

export interface RawNewsArticle {
  id: string;
  title: string;
  description: string | null;
  source: string;
  url: string;
  publishedAt: Date;
  language: string;
  rawText?: string | null;
  provider: string;
}

export interface PerAssetImpact {
  direction: "positive" | "negative" | "neutral";
  impactScore: number; // -1..1
  confidence: number; // 0..1
}

export interface NewsAnalysisResult {
  asset: AssetSymbol | string;
  assets: string[];
  eventType: EventType;
  sentiment: number;
  importance: number;
  novelty: number;
  timeHorizon: "short_term" | "medium_term" | "long_term";
  impact: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  reason: string;
  perAssetImpact: Record<string, PerAssetImpact>;
  analyzerVersion: string;
}

export type Signal =
  | "STRONG_BULLISH"
  | "BULLISH"
  | "SLIGHTLY_BULLISH"
  | "NEUTRAL"
  | "SLIGHTLY_BEARISH"
  | "BEARISH"
  | "STRONG_BEARISH";

export type ConfidenceLabel = "LOW" | "MEDIUM" | "HIGH";

/**
 * "data_collection" behaves exactly like "live" for provider selection
 * (real providers when configured, honest fallbacks otherwise) but is
 * stamped distinctly on every stored row so it's clear this run's purpose
 * is building a real labeled dataset, not display. It never executes
 * trades (paper trading remains simulated-only in every mode).
 */
export type SystemMode = "live" | "demo" | "data_collection";
