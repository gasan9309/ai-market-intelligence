import { Signal } from "@/lib/types";
import { SIGNAL_LABELS } from "@/lib/ml/signal";

const STYLES: Record<Signal, string> = {
  STRONG_BULLISH: "bg-[#12351f] text-[#3ddb8f] border-[#1f5c37]",
  BULLISH: "bg-[#12301f] text-[#34c98a] border-[#1c4a2f]",
  SLIGHTLY_BULLISH: "bg-[#1c2417] text-[#9bd67a] border-[#2c3a22]",
  NEUTRAL: "bg-bg-raised text-text-secondary border-border",
  SLIGHTLY_BEARISH: "bg-[#2b2415] text-[#e0b15f] border-[#4a3c1f]",
  BEARISH: "bg-[#331d15] text-[#f0904f] border-[#59301f]",
  STRONG_BEARISH: "bg-[#3a1417] text-[#f26b70] border-[#622027]",
};

export function SignalBadge({ signal, className = "" }: { signal: Signal | string; className?: string }) {
  const s = signal as Signal;
  const style = STYLES[s] ?? STYLES.NEUTRAL;
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${style} ${className}`}>
      {SIGNAL_LABELS[s] ?? signal}
    </span>
  );
}

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "text-bull",
  MEDIUM: "text-accent",
  LOW: "text-text-tertiary",
};

export function ConfidenceTag({ label, score }: { label: string; score?: number }) {
  return (
    <span className={`text-xs font-medium ${CONFIDENCE_STYLES[label] ?? "text-text-secondary"}`}>
      {label} CONFIDENCE{typeof score === "number" ? ` · ${Math.round(score * 100)}` : ""}
    </span>
  );
}
