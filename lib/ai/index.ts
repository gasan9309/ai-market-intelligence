import { AIAnalyzer } from "./types";
import { DemoAIAnalyzer } from "./demo-analyzer";
import { LlmAnalyzer } from "./llm-analyzer";
import { resolveMode } from "@/lib/config";

/**
 * Single place deciding which AIAnalyzer backs the app.
 *
 * AUDIT FIX: DEMO MODE must ALWAYS use the rule-based DemoAIAnalyzer, even
 * if an LLM key happens to be present in the environment (e.g. a developer
 * has LLM_API_KEY set locally for other work). Mode is checked FIRST and
 * is authoritative — key presence only matters once we're actually in
 * live/data_collection mode. This guarantees demo mode never makes an
 * external API call and never depends on any key being present or absent.
 */
export function getAIAnalyzer(): AIAnalyzer {
  if (resolveMode() === "demo") return new DemoAIAnalyzer();

  const key = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (key) return new LlmAnalyzer(key);
  // Live mode without an LLM key: fall back to the rule-based analyzer,
  // labeled honestly via analyzerVersion — never silently swapped for
  // fabricated data.
  return new DemoAIAnalyzer();
}
