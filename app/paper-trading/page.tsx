"use client";

import { useState } from "react";
import { usePolling, getJSON } from "@/lib/hooks";
import { ASSETS } from "@/lib/config";
import { formatPrice, timeAgo } from "@/lib/format";

export default function PaperTradingPage() {
  const { data, loading } = usePolling(() => getJSON<any>("/api/paper-trades"), 10_000);
  const [asset, setAsset] = useState<string>(ASSETS[0].symbol);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [size, setSize] = useState(1000);
  const [stopPrice, setStopPrice] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openTrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/paper-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          size,
          stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
          targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function closeTrade(id: string) {
    await fetch(`/api/paper-trades/${id}/close`, { method: "POST" });
  }

  const portfolio = data?.portfolio;
  const trades = data?.trades ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Paper Trading</h1>
        <p className="text-sm text-text-tertiary">
          Simulated positions only — <strong>PAPER TRADE, NOT REAL MONEY</strong>. No real orders are ever placed.
        </p>
      </div>

      {portfolio && (
        <div className="panel grid grid-cols-2 gap-4 rounded-md p-4 sm:grid-cols-4">
          <Metric label="Starting capital" value={`$${portfolio.startingCapital.toLocaleString()}`} />
          <Metric label="Equity" value={`$${portfolio.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
          <Metric label="Realized P&L" value={fmtSigned(portfolio.realizedPnl)} color={portfolio.realizedPnl >= 0} />
          <Metric label="Unrealized P&L" value={fmtSigned(portfolio.unrealizedPnl)} color={portfolio.unrealizedPnl >= 0} />
        </div>
      )}

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
        <Field label="Direction">
          <select value={direction} onChange={(e) => setDirection(e.target.value as "long" | "short")} className="panel rounded px-2 py-1.5 text-sm">
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Size ($)">
          <input type="number" value={size} onChange={(e) => setSize(parseFloat(e.target.value))} className="panel w-28 rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Stop (optional)">
          <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} className="panel w-28 rounded px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Target (optional)">
          <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="panel w-28 rounded px-2 py-1.5 text-sm" />
        </Field>
        <button
          onClick={openTrade}
          disabled={busy}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Opening…" : "Open paper position"}
        </button>
      </div>
      {error && <div className="text-sm text-bear">{error}</div>}

      <div className="panel overflow-x-auto rounded-md">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b hairline text-left text-xs text-text-tertiary">
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Direction</th>
              <th className="px-3 py-2 font-medium">Entry</th>
              <th className="px-3 py-2 font-medium">Current</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">P&amp;L</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Opened</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {!loading && trades.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-text-tertiary">
                  No paper trades yet.
                </td>
              </tr>
            )}
            {trades.map((t: any) => (
              <tr key={t.id} className="border-b hairline last:border-0">
                <td className="px-3 py-2">{t.asset}</td>
                <td className="px-3 py-2 uppercase text-text-secondary">{t.direction}</td>
                <td className="px-3 py-2 font-data">${formatPrice(t.entryPrice, t.asset)}</td>
                <td className="px-3 py-2 font-data">${formatPrice(t.currentPrice, t.asset)}</td>
                <td className="px-3 py-2 font-data">${t.size.toLocaleString()}</td>
                <td className={`px-3 py-2 font-data ${(t.livePnl ?? 0) >= 0 ? "text-bull" : "text-bear"}`}>{fmtSigned(t.livePnl ?? 0)}</td>
                <td className="px-3 py-2 text-text-secondary">{t.status.replace("_", " ")}</td>
                <td className="px-3 py-2 text-text-tertiary">{timeAgo(t.openedAt)}</td>
                <td className="px-3 py-2">
                  {t.status === "open" && (
                    <button onClick={() => closeTrade(t.id)} className="text-xs text-accent hover:underline">
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function Metric({ label, value, color }: { label: string; value: string; color?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-text-tertiary">{label}</div>
      <div className={`font-data text-lg ${color === undefined ? "" : color ? "text-bull" : "text-bear"}`}>{value}</div>
    </div>
  );
}

function fmtSigned(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
