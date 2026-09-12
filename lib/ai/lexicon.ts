import { EventType } from "@/lib/types";

export const POSITIVE_WORDS = [
  "beat", "beats", "surge", "surges", "rally", "rallies", "gain", "gains", "gained",
  "rise", "rises", "rose", "jump", "jumps", "higher", "record high", "inflow", "inflows",
  "approve", "approves", "approved", "cut cools", "eases", "eased", "easing", "cooled",
  "cooling", "boost", "boosts", "strong", "strength", "optimis", "bullish", "upgrade",
  "upgraded", "accumulation", "progress", "successfully", "below expectations", "steady",
];

export const NEGATIVE_WORDS = [
  "fall", "falls", "fell", "drop", "drops", "dropped", "plunge", "plunges", "slump",
  "slumps", "decline", "declines", "lower", "record low", "outflow", "outflows",
  "delay", "delays", "delayed", "reject", "rejects", "rejected", "hike", "hikes",
  "tension", "tensions", "sell-off", "selloff", "weigh", "weighs", "weighed", "weak",
  "weakness", "bearish", "downgrade", "downgraded", "contraction", "stress", "risk",
  "concerns", "fear", "fears", "slower", "above expectations", "hawkish", "restrict",
  "restrictions", "cools", "outage", "warns", "warning",
];

export const HIGH_IMPORTANCE_WORDS = [
  "fed", "federal reserve", "ecb", "central bank", "sec", "rate", "rates", "cpi",
  "inflation", "gdp", "nonfarm", "payrolls", "opec", "war", "geopolitical", "regulation",
  "etf", "earnings", "treasury", "yields",
];

export const EVENT_TYPE_KEYWORDS: Record<EventType, string[]> = {
  monetary_policy: ["fed", "federal reserve", "ecb", "central bank", "rate cut", "rate hike", "fomc"],
  inflation: ["cpi", "inflation", "price index", "pce"],
  employment: ["payrolls", "unemployment", "jobless", "labor market", "jobs report"],
  interest_rates: ["interest rate", "rates", "yield", "yields"],
  regulation: ["sec", "regulator", "regulation", "rule change", "compliance"],
  geopolitical: ["geopolitical", "war", "tension", "conflict", "ceasefire", "sanctions"],
  earnings: ["earnings", "guidance", "quarterly results", "beat estimates"],
  etf: ["etf", "spot bitcoin etf", "fund inflow", "fund outflow"],
  crypto_flows: ["on-chain", "exchange outflow", "exchange inflow", "whale", "wallet", "network upgrade", "mainnet"],
  market_structure: ["market structure", "committee vote", "legislation", "bill"],
  economic_growth: ["gdp", "growth", "pmi", "manufacturing", "retail sales"],
  banking: ["bank", "deposit", "lender", "liquidity"],
  commodity: ["gold", "bullion", "commodity", "commodities"],
  oil: ["oil", "opec", "crude", "barrel"],
  currency: ["dollar", "dxy", "currency", "euro", "forex", "fx"],
  technology: ["ai chip", "semiconductor", "cloud", "tech earnings", "export restriction"],
  other: [],
};

export function detectEventType(text: string): EventType {
  const lower = text.toLowerCase();
  let best: EventType = "other";
  let bestScore = 0;
  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS) as [EventType, string[]][]) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}
