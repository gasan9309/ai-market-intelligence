/**
 * Cheap, free filtering pass applied BEFORE any AI/LLM call (spec section
 * 28: cost control). Only articles that pass this get analyzed at all,
 * and analysis results are cached by content hash upstream in ingestion.
 */
const FINANCIAL_KEYWORDS = [
  "fed", "federal reserve", "ecb", "central bank", "inflation", "cpi", "rate",
  "bitcoin", "btc", "ethereum", "eth", "crypto", "gold", "s&p", "stocks",
  "market", "dollar", "euro", "yield", "treasury", "sec", "etf", "earnings",
  "gdp", "jobs", "payrolls", "unemployment", "opec", "oil", "bank", "economy",
  "economic", "dxy", "institutional", "liquidity", "geopolitical", "regulation",
  "risk appetite", "interest rate",
];

export function isFinanciallyRelevant(title: string, description: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return FINANCIAL_KEYWORDS.some((k) => text.includes(k));
}

/**
 * BTC-specific relevance gate (spec: "Only send relevant financial/crypto
 * articles to the AI analysis layer" for BTC live mode). Tighter than the
 * generic financial gate above — used to decide whether an article should
 * even be considered for BTC's rolling news score, separate from whether
 * it's worth analyzing at all.
 */
const BTC_KEYWORDS = [
  "bitcoin", "btc", "crypto", "ethereum", "etf", "federal reserve", "fed",
  "interest rate", "inflation", "usd", "dollar", "dxy", "regulation", "sec",
  "institutional", "risk appetite", "liquidity", "geopolitical",
];

export function isBtcRelevant(title: string, description: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return BTC_KEYWORDS.some((k) => text.includes(k));
}

/** Very light language guard — demo/RSS content here is English-only for MVP. */
export function isSupportedLanguage(language: string): boolean {
  return language === "en";
}
