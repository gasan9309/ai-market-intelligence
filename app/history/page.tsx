"use client";

import { useState } from "react";
import Link from "next/link";
import { usePolling, getJSON } from "@/lib/hooks";
import { formatPrice, formatProb, formatPct, formatClock } from "@/lib/format";
import { SignalBadge } from "@/components/SignalBadge";
import { ASSETS } from "@/lib/config";
import { HORIZONS } from "@/lib/types";

export default function HistoryPage() {
  const [asset, setAsset] = useState<string>("");
  const [horizon, setHorizon] = useState<string>("");

  const qs = new URLSearchParams();
  if (asset) qs.set("asset", asset);
  if (horizon) qs.set("horizon", horizon);
  qs.set("limit", "100");

  const { data, loading } = usePolling(() => getJSON<any>(`/api/history?${qs.toString()}`), 20_000, qs.toString());

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Prediction History</h1>
        <p className="text-sm text-text-tertiary">Every prediction is stored with its feature snapshot and later evaluated against the actual outcome.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="panel rounded px-3 py-1.5 text-sm"
        >
          <option value="">All assets</option>
          {ASSETS.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.displaySymbol}
            </option>
          ))}
        </select>
        <select
          value={horizon}
          onChange={(e) => setHorizon(e.target.value)}
          className="panel rounded px-3 py-1.5 text-sm"
        >
          <option value="">All horizons</option>
          {HORIZONS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      <div className="panel overflow-x-auto rounded-md">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b hairline text-left text-xs text-text-tertiary">
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Horizon</th>
              <th className="px-3 py-2 font-medium">Predicted</th>
              <th className="px-3 py-2 font-medium">Signal</th>
              <th className="px-3 py-2 font-medium">Probability</th>
              <th className="px-3 py-2 font-medium">Price @ prediction</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actual return</th>
              <th className="px-3 py-2 font-medium">Correct?</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-text-tertiary">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-text-tertiary">
                  No predictions match these filters yet.
                </td>
              </tr>
            )}
            {items.map((p: any) => (
              <tr key={p.id} className="border-b hairline last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/asset/${p.asset}`} className="hover:text-accent">
                    {p.asset}
                  </Link>
                </td>
                <td className="px-3 py-2 uppercase text-text-secondary">{p.horizon}</td>
                <td className="px-3 py-2 text-text-secondary">{formatClock(p.predictionTimestamp)}</td>
                <td className="px-3 py-2">
                  <SignalBadge signal={p.signal} />
                </td>
                <td className="px-3 py-2 font-data">{formatProb(p.probabilityUp)}</td>
                <td className="px-3 py-2 font-data">${formatPrice(p.priceAtPrediction, p.asset)}</td>
                <td className="px-3 py-2 text-text-secondary">{p.status === "evaluated" ? "Evaluated" : "Pending"}</td>
                <td className="px-3 py-2 font-data">{p.actualReturn !== null ? formatPct(p.actualReturn) : "—"}</td>
                <td className="px-3 py-2">
                  {p.correctDirection === null ? (
                    "—"
                  ) : p.correctDirection ? (
                    <span className="text-bull">Yes</span>
                  ) : (
                    <span className="text-bear">No</span>
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
