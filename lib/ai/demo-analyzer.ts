import { AIAnalyzer } from "./types";
import { NewsAnalysisResult, RawNewsArticle, EventType, PerAssetImpact } from "@/lib/types";
import { POSITIVE_WORDS, NEGATIVE_WORDS, HIGH_IMPORTANCE_WORDS, detectEventType } from "./lexicon";
import { clamp, hashText, mulberry32 } from "@/lib/util";
import { ANALYZER_VERSION_DEMO, ASSETS } from "@/lib/config";

const ASSET_KEYWORDS: Record<string, string[]> = {
  BTC: ["bitcoin", "btc"],
  ETH: ["ethereum", "eth", "ether"],
  EURUSD: ["euro", "eur/usd", "ecb", "eurozone"],
  SPY: ["s&p", "s&p 500", "stocks", "equities", "wall street", "nasdaq", "index futures", "tech earnings", "bank", "regional lender"],
  GOLD: ["gold", "bullion", "xau"],
};

// Default assets affected when an event type is macro and no specific
// asset keyword was matched directly in the text.
const EVENT_TYPE_DEFAULT_ASSETS: Record<EventType, string[]> = {
  monetary_policy: ["BTC", "ETH", "EURUSD", "SPY", "GOLD"],
  inflation: ["EURUSD", "SPY", "GOLD", "BTC"],
  employment: ["SPY", "EURUSD", "GOLD"],
  interest_rates: ["EURUSD", "SPY", "GOLD", "BTC"],
  regulation: ["BTC", "ETH"],
  geopolitical: ["GOLD", "SPY"],
  earnings: ["SPY"],
  etf: ["BTC", "ETH"],
  crypto_flows: ["BTC", "ETH"],
  market_structure: ["BTC", "ETH"],
  economic_growth: ["SPY", "EURUSD"],
  banking: ["SPY", "GOLD"],
  commodity: ["GOLD"],
  oil: ["GOLD", "SPY"],
  currency: ["EURUSD", "GOLD", "BTC"],
  technology: ["SPY"],
  other: [],
};

export class DemoAIAnalyzer implements AIAnalyzer {
  name = ANALYZER_VERSION_DEMO;

  async analyze(article: RawNewsArticle): Promise<NewsAnalysisResult> {
    const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
    const rand = mulberry32(parseInt(hashText(article.id).slice(0, 8), 16));

    const posHits = POSITIVE_WORDS.filter((w) => text.includes(w));
    const negHits = NEGATIVE_WORDS.filter((w) => text.includes(w));
    const rawScore = posHits.length - negHits.length;
    const sentiment = clamp(rawScore / Math.max(2, posHits.length + negHits.length + 1) * 1.6, -1, 1);

    const eventType = detectEventType(text);

    const importanceWordHits = HIGH_IMPORTANCE_WORDS.filter((w) => text.includes(w)).length;
    const eventCriticality = ["monetary_policy", "regulation", "geopolitical", "inflation", "banking"].includes(eventType) ? 0.25 : 0;
    const importance = clamp(0.3 + importanceWordHits * 0.12 + eventCriticality, 0, 1);

    const noveltyBoostWords = ["surprise", "unexpected", "breaking", "first time", "record"];
    const noveltyBoost = noveltyBoostWords.some((w) => text.includes(w)) ? 0.25 : 0;
    const novelty = clamp(0.45 + noveltyBoost + (rand() - 0.5) * 0.3, 0.1, 0.97);

    // Direct asset keyword matches
    const directAssets = Object.entries(ASSET_KEYWORDS)
      .filter(([, kws]) => kws.some((k) => text.includes(k)))
      .map(([symbol]) => symbol);

    const affectedAssets = directAssets.length > 0 ? directAssets : EVENT_TYPE_DEFAULT_ASSETS[eventType];

    const perAssetImpact: Record<string, PerAssetImpact> = {};
    for (const asset of affectedAssets) {
      const isDirect = directAssets.includes(asset);
      const magnitude = isDirect ? 1.0 : 0.55;
      const jitter = (rand() - 0.5) * 0.15;
      const impactScore = clamp(sentiment * magnitude + jitter, -1, 1);
      perAssetImpact[asset] = {
        direction: impactScore > 0.08 ? "positive" : impactScore < -0.08 ? "negative" : "neutral",
        impactScore: round2(impactScore),
        confidence: round2(clamp(0.4 + (isDirect ? 0.3 : 0.1) + importanceWordHits * 0.05, 0, 1)),
      };
    }

    const matchedKeywordCount = posHits.length + negHits.length + importanceWordHits;
    const confidence = clamp(0.35 + matchedKeywordCount * 0.08, 0.2, 0.95);

    const primaryAsset = affectedAssets[0] ?? "SPY";
    const reason = buildReason(eventType, sentiment, posHits, negHits, affectedAssets);

    return {
      asset: primaryAsset,
      assets: affectedAssets,
      eventType,
      sentiment: round2(sentiment),
      importance: round2(importance),
      novelty: round2(novelty),
      timeHorizon: importance > 0.7 ? "medium_term" : "short_term",
      impact: sentiment > 0.1 ? "positive" : sentiment < -0.1 ? "negative" : affectedAssets.length > 2 ? "mixed" : "neutral",
      confidence: round2(confidence),
      reason,
      perAssetImpact,
      analyzerVersion: this.name,
    };
  }
}

function buildReason(eventType: string, sentiment: number, pos: string[], neg: string[], assets: string[]): string {
  const polarity = sentiment > 0.1 ? "positive" : sentiment < -0.1 ? "negative" : "mixed/neutral";
  const cues = [...pos.slice(0, 2), ...neg.slice(0, 2)];
  const cuePart = cues.length ? ` Key cues: ${cues.join(", ")}.` : "";
  return `Classified as ${eventType.replace(/_/g, " ")} with ${polarity} tone, affecting ${assets.join(", ")}.${cuePart}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
