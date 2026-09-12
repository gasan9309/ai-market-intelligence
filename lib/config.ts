import { AssetDef, SystemMode } from "./types";

export const ASSETS: AssetDef[] = [
  { symbol: "BTC", name: "Bitcoin", assetClass: "crypto", displaySymbol: "BTC/USD" },
  { symbol: "ETH", name: "Ethereum", assetClass: "crypto", displaySymbol: "ETH/USD" },
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "fx", displaySymbol: "EUR/USD" },
  { symbol: "SPY", name: "S&P 500 (SPY)", assetClass: "equity_index", displaySymbol: "SPY" },
  { symbol: "GOLD", name: "Gold", assetClass: "commodity", displaySymbol: "XAU/USD" },
];

export function getAsset(symbol: string): AssetDef | undefined {
  return ASSETS.find((a) => a.symbol === symbol);
}

/**
 * MODE is resolved once per process from env.
 * - "demo" or "live" or "data_collection" if explicitly forced via MODE.
 * - Otherwise: "live" only once at least one news key AND one market data
 *   key are present; else falls back to "demo" and says so in the UI
 *   (never silently pretends demo data is live).
 * "data_collection" is never auto-derived — it must be requested
 * explicitly via MODE=data_collection, since it's a deliberate choice to
 * start building a real labeled dataset, not a fallback state.
 */
export function resolveMode(): SystemMode {
  const forced = process.env.MODE;
  if (forced === "demo") return "demo";
  if (forced === "live") return "live";
  if (forced === "data_collection") return "data_collection";
  const hasNewsKey = !!process.env.NEWS_API_KEY;
  const hasMarketKey = !!process.env.MARKET_DATA_API_KEY;
  return hasNewsKey && hasMarketKey ? "live" : "demo";
}

export const MODEL_VERSION = "baseline-heuristic-v0.1";
export const ANALYZER_VERSION_DEMO = "rule-based-nlp-v0.1";
export const ANALYZER_VERSION_LLM = "llm-json-v0.1";
