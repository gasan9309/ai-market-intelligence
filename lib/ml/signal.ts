import { Signal } from "@/lib/types";

export function classifySignal(probabilityUp: number): Signal {
  if (probabilityUp >= 0.7) return "STRONG_BULLISH";
  if (probabilityUp >= 0.6) return "BULLISH";
  if (probabilityUp >= 0.55) return "SLIGHTLY_BULLISH";
  if (probabilityUp >= 0.45) return "NEUTRAL";
  if (probabilityUp >= 0.4) return "SLIGHTLY_BEARISH";
  if (probabilityUp >= 0.3) return "BEARISH";
  return "STRONG_BEARISH";
}

export const SIGNAL_LABELS: Record<Signal, string> = {
  STRONG_BULLISH: "Strong Bullish",
  BULLISH: "Bullish",
  SLIGHTLY_BULLISH: "Slightly Bullish",
  NEUTRAL: "Neutral",
  SLIGHTLY_BEARISH: "Slightly Bearish",
  BEARISH: "Bearish",
  STRONG_BEARISH: "Strong Bearish",
};

export const SIGNAL_COLOR: Record<Signal, string> = {
  STRONG_BULLISH: "#16a34a",
  BULLISH: "#22c55e",
  SLIGHTLY_BULLISH: "#84cc16",
  NEUTRAL: "#9ca3af",
  SLIGHTLY_BEARISH: "#f59e0b",
  BEARISH: "#f97316",
  STRONG_BEARISH: "#ef4444",
};
