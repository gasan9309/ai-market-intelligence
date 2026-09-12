"use client";

import { usePolling, getJSON } from "@/lib/hooks";
import { formatPct, formatProb } from "@/lib/format";
import { HORIZONS } from "@/lib/types";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-text-tertiary">{label}</div>
      <div className="font-data text-sm">{value}</div>
    </div>
  );
}

export default function PerformancePage() {
  const { data, loading } = usePolling(() => getJSON<any>("/api/performance"), 30_000);
  const matrix = data?.matrix ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Model Performance</h1>
        <p className="text-sm text-text-tertiary">
          Metrics are computed only from evaluated predictions (actual outcome already known). Cells with too few
          evaluated predictions show &ldquo;Insufficient data&rdquo; rather than an unreliable number.
        </p>
      </div>

      <div className="rounded-md border border-[#4a3c1f] bg-[#2b2415] px-4 py-2.5 text-xs text-[#e0b15f]">
        <strong>UNTRAINED BASELINE</strong> — the current model is a hand-set heuristic (momentum, news sentiment,
        volatility combined via a fixed formula), not fit on real historical outcomes. It has not been trained.
        Numbers below reflect how that heuristic happens to perform, not a validated forecasting model.
      </div>

      {loading && !data && <div className="panel h-40 animate-pulse rounded-md" />}

      <div className="flex flex-col gap-6">
        {matrix.map((row: any) => (
          <div key={row.asset} className="panel rounded-md p-4">
            <h2 className="mb-3 text-sm font-semibold">{row.displaySymbol}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {HORIZONS.map((h) => {
                const m = row.byHorizon[h];
                if (!m) return null;
                return (
                  <div key={h} className="rounded border hairline p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs uppercase text-text-tertiary">{h}</span>
                      <span className="text-[10px] text-text-tertiary">n={m.sampleSize}</span>
                    </div>
                    {m.insufficientData ? (
                      <div className="text-xs text-text-tertiary">Insufficient data</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Accuracy" value={formatProb(m.directionalAccuracy)} />
                        <Metric label="Win rate" value={formatProb(m.winRate)} />
                        <Metric label="Precision" value={m.precision !== null ? formatProb(m.precision) : "—"} />
                        <Metric label="Recall" value={m.recall !== null ? formatProb(m.recall) : "—"} />
                        <Metric label="Avg return" value={formatPct(m.averageReturnAfterSignal, 2)} />
                        <Metric label="Max drawdown" value={formatPct(m.maxDrawdown, 1)} />
                        <Metric label="Profit factor" value={m.profitFactor !== null ? m.profitFactor.toFixed(2) : "—"} />
                        <Metric label="Sharpe" value={m.sharpeRatio.toFixed(2)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
