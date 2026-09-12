"use client";

import { usePolling, getJSON } from "@/lib/hooks";
import { formatPrice, formatProb, formatClock, timeAgo } from "@/lib/format";
import { SignalBadge, ConfidenceTag } from "./SignalBadge";

interface StatusResponse {
  mode: string;
  providers: { llm: { active: boolean } };
}

export function BtcIntelligencePanel() {
  const asset = usePolling(() => getJSON<any>("/api/assets/BTC"), 15_000);
  const status = usePolling(() => getJSON<StatusResponse>("/api/status"), 20_000);

  const p1h = asset.data?.latestPredictions?.["1h"];
  const aiMode = status.data ? (status.data.providers.llm.active ? "LLM" : "RULE-BASED") : "—";

  return (
    <div className="panel rounded-md p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Live BTC Intelligence</h2>
        <span className="rounded border hairline px-2 py-0.5 text-[10px] uppercase text-text-tertiary">AI mode: {aiMode}</span>
      </div>

      {!asset.data ? (
        <div className="h-32 animate-pulse rounded bg-bg-raised" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <div>
            <div className="text-xs text-text-tertiary">BTC/USD</div>
            <div className="font-data text-3xl font-semibold">
              ${formatPrice(asset.data.priceHistory?.[asset.data.priceHistory.length - 1]?.price, "BTC")}
            </div>
            {p1h && (
              <div className="mt-2 flex items-center gap-2">
                <SignalBadge signal={p1h.signal} />
                <span className="font-data text-lg">{formatProb(p1h.probabilityUp)}</span>
                <ConfidenceTag label={p1h.confidenceLabel} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="News Impact (1h)" value={asset.data.newsImpact1h !== null ? signed(asset.data.newsImpact1h) : "—"} />
            <Metric label="Market Momentum" value={asset.data.momentum !== null ? signed(asset.data.momentum) : "—"} />
            <Metric
              label="Last market update"
              value={
                asset.data.priceHistory?.length
                  ? `${formatClock(asset.data.priceHistory[asset.data.priceHistory.length - 1].timestamp)} UTC`
                  : "—"
              }
            />
            <Metric label="Last news" value={asset.data.news?.[0] ? timeAgo(asset.data.news[0].publishedAt) : "—"} />
          </div>
        </div>
      )}

      {p1h && p1h.explanationDrivers?.length > 0 && (
        <div className="mt-4 border-t hairline pt-3">
          <div className="mb-1 text-xs text-text-tertiary">Why this signal?</div>
          <ul className="list-inside list-disc space-y-1 text-xs text-text-secondary">
            {p1h.explanationDrivers.slice(0, 3).map((d: string, i: number) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-text-tertiary">{label}</div>
      <div className="font-data text-sm">{value}</div>
    </div>
  );
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}
