import { AIAnalyzer } from "./types";
import { NewsAnalysisResult, RawNewsArticle } from "@/lib/types";
import { ANALYZER_VERSION_LLM, ASSETS } from "@/lib/config";

const SYSTEM_PROMPT = `You are a financial news classifier. Given a news headline and description, output ONLY a JSON object (no markdown fences, no prose) with this exact shape:
{
  "assets": ["BTC" | "ETH" | "EURUSD" | "SPY" | "GOLD", ...affected assets from this fixed set only],
  "event_type": "monetary_policy|inflation|employment|interest_rates|regulation|geopolitical|earnings|etf|crypto_flows|market_structure|economic_growth|banking|commodity|oil|currency|technology|other",
  "sentiment": number between -1 and 1,
  "importance": number between 0 and 1,
  "novelty": number between 0 and 1,
  "time_horizon": "short_term" | "medium_term" | "long_term",
  "impact": "positive" | "negative" | "neutral" | "mixed",
  "confidence": number between 0 and 1,
  "reason": "one short sentence",
  "per_asset_impact": { "<ASSET>": { "direction": "positive|negative|neutral", "impact_score": number -1..1, "confidence": number 0..1 }, ... }
}
Only include assets from: BTC, ETH, EURUSD, SPY, GOLD. If the article is not financially relevant to any of them, return an empty assets array and event_type "other".`;

/**
 * Live-mode analyzer. Calls the Anthropic Messages API directly (no SDK
 * dependency) using ANTHROPIC_API_KEY / LLM_API_KEY. This keeps the
 * AIAnalyzer interface identical between demo and live so nothing else in
 * the app needs to know which one is active.
 */
export class LlmAnalyzer implements AIAnalyzer {
  name = ANALYZER_VERSION_LLM;
  constructor(private apiKey: string) {}

  async analyze(article: RawNewsArticle): Promise<NewsAnalysisResult> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Headline: ${article.title}\nDescription: ${article.description ?? ""}`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`LLM analyzer error: HTTP ${res.status}`);
    const data = await res.json();
    const text: string = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const validAssets = new Set<string>(ASSETS.map((a) => a.symbol));
    const assets: string[] = (parsed.assets || []).filter((a: string) => validAssets.has(a));

    return {
      asset: assets[0] ?? "SPY",
      assets,
      eventType: parsed.event_type ?? "other",
      sentiment: clampNum(parsed.sentiment, -1, 1),
      importance: clampNum(parsed.importance, 0, 1),
      novelty: clampNum(parsed.novelty, 0, 1),
      timeHorizon: parsed.time_horizon ?? "short_term",
      impact: parsed.impact ?? "neutral",
      confidence: clampNum(parsed.confidence, 0, 1),
      reason: parsed.reason ?? "",
      perAssetImpact: parsed.per_asset_impact ?? {},
      analyzerVersion: this.name,
    };
  }
}

function clampNum(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(n)) return (min + max) / 2;
  return Math.max(min, Math.min(max, n));
}
