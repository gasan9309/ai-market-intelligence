"use client";

import { useState } from "react";
import { ASSETS } from "@/lib/config";
import { HORIZONS, Horizon } from "@/lib/types";
import { formatPct, formatProb } from "@/lib/format";
import { getJSON } from "@/lib/hooks";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString().slice(0, 10);
}

export default function BacktestPage() {
  const [asset, setAsset] = useState<string>(ASSETS[0].symbol);
  const [horizon, setHorizon] = useState<Horizon>("1h");
  const [startDate, setStartDate] = useState(daysAgoIso(3));
  const [endDate, setEndDate] = useState(daysAgoIso(0));
  const [threshold, setThreshold] = useState(0.65);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          horizon,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + "T23:59:59").toISOString(),
          probabilityThreshold: threshold,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backtest failed");
      setResult(data.result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Backtesting</h1>
        <p className="text-sm text-text-tertiary">
          Research / paper-trading tool only. Runs against already-evaluated historical predictions — no future
          information is used.
        </p>
      </div>

      <div className="panel flex flex-wrap items-end gap-4 rounded-md p-4">
        <Field label="Asset">
          <select value={asset} onChange={(e) => setAsset(e.target.value)} className="panel rounded px-2 py-1.5 text-sm">
            {ASSETS.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.displaySymbol}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Horizon">
          <select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)} className="panel rounded px-2 py-1.5 text-sm">
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="panel rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="End date">
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="panel rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label={`Min. probability threshold (${Math.round(threshold * 100)}%)`}>
          <input
            type="range"
            min={0.5}
            max={0.9}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-40"
          />
        </Field>
        <button
          onClick={run}
          disabled={loading}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run backtest"}
        </button>
      </div>

      {error && <div className="text-sm text-bear">{error}</div>}

      {result && (
        <div className="panel rounded-md p-4">
          {result.insufficientData ? (
            <div className="text-sm text-text-tertiary">
              Insufficient data — {result.note} ({result.numberOfSignals} signal(s) found)
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="Signals" value={String(result.numberOfSignals)} />
                <Metric label="Win rate (net)" value={formatProb(result.winRate)} />
                <Metric label="Max drawdown (net)" value={formatPct(result.maxDrawdownNet, 1)} />
                <Metric label="Costs modeled" value={`${((result.feesPct + result.slippagePct) * 2 * 100).toFixed(2)}% round-trip`} />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded border hairline p-3">
                <Metric label="Avg return (gross)" value={formatPct(result.averageReturnGross, 2)} />
                <Metric label="Cumulative (gross)" value={formatPct(result.cumulativeReturnGross, 2)} />
                <Metric label="Avg return (net)" value={formatPct(result.averageReturnNet, 2)} />
                <Metric label="Cumulative (net)" value={formatPct(result.cumulativeReturnNet, 2)} />
              </div>
              <p className="text-xs text-text-tertiary">
                Net includes {((result.feesPct + result.slippagePct) * 2 * 100).toFixed(2)}% modeled round-trip fees + slippage per signal. Judge the strategy by net, not gross.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-tertiary">
      {label}
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-text-tertiary">{label}</div>
      <div className="font-data text-lg">{value}</div>
    </div>
  );
}
