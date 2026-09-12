"use client";

import { use } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { usePolling, getJSON } from "@/lib/hooks";
import { formatPrice, formatProb, timeAgo, formatClock } from "@/lib/format";
import { SignalBadge, ConfidenceTag } from "@/components/SignalBadge";
import { HORIZONS } from "@/lib/types";

export default function AssetDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const { data, loading, error } = usePolling(() => getJSON<any>(`/api/assets/${symbol}`), 20_000);

  if (error) {
    return <div className="panel rounded-md p-4 text-sm text-bear">Market data temporarily unavailable. ({error})</div>;
  }
  if (loading || !data) {
    return <div className="panel h-64 animate-pulse rounded-md" />;
  }

  const { asset, priceHistory, predictionHistory1h, latestPredictions, news } = data;

  const priceSeries = priceHistory.map((p: any) => ({
    t: new Date(p.timestamp).getTime(),
    price: p.price,
  }));
  const predSeries = predictionHistory1h.map((p: any) => ({
    t: new Date(p.timestamp).getTime(),
    prob: Math.round(p.probabilityUp * 100),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-xs text-text-tertiary hover:text-text-primary">
          ← Dashboard
        </Link>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">{asset.displaySymbol}</h1>
          <span className="text-sm text-text-tertiary">{asset.name}</span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartPanel title="Price (last 3 days)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={priceSeries}>
              <CartesianGrid stroke="#1a202c" vertical={false} />
              <XAxis dataKey="t" tickFormatter={(t: number) => formatClock(new Date(t).toISOString())} stroke="#565f74" fontSize={11} minTickGap={40} />
              <YAxis domain={["auto", "auto"]} stroke="#565f74" fontSize={11} width={70} />
              <Tooltip
                contentStyle={{ background: "#131822", border: "1px solid #232a38", fontSize: 12 }}
                labelFormatter={(t: any) => new Date(t).toLocaleString()}
                formatter={(v: any) => [formatPrice(v, asset.symbol), "Price"]}
              />
              <Line type="monotone" dataKey="price" stroke="#ff9f1c" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="1H Prediction Probability Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={predSeries}>
              <CartesianGrid stroke="#1a202c" vertical={false} />
              <XAxis dataKey="t" tickFormatter={(t: number) => formatClock(new Date(t).toISOString())} stroke="#565f74" fontSize={11} minTickGap={40} />
              <YAxis domain={[0, 100]} stroke="#565f74" fontSize={11} width={40} />
              <ReferenceLine y={50} stroke="#2a3244" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: "#131822", border: "1px solid #232a38", fontSize: 12 }}
                labelFormatter={(t: any) => new Date(t).toLocaleString()}
                formatter={(v: any) => [`${v}%`, "P(up)"]}
              />
              <Line type="monotone" dataKey="prob" stroke="#34c98a" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-secondary">Forecasts &amp; Explanation</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {HORIZONS.map((h) => {
            const p = latestPredictions[h];
            return (
              <div key={h} className="panel flex flex-col gap-3 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-text-tertiary">{h} forecast</span>
                  {p && <SignalBadge signal={p.signal} />}
                </div>
                {p ? (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="font-data text-2xl font-semibold">{formatProb(p.probabilityUp)}</span>
                      <ConfidenceTag label={p.confidenceLabel} score={p.confidenceScore} />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-text-tertiary">Why?</div>
                      <ul className="list-inside list-disc space-y-1 text-xs text-text-secondary">
                        {p.explanationDrivers.map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    {p.riskFactors.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs text-text-tertiary">Risk factors</div>
                        <ul className="list-inside list-disc space-y-1 text-xs text-bear-soft" style={{ color: "var(--bear-soft)" }}>
                          {p.riskFactors.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="text-[10px] text-text-tertiary">
                      Model {p.modelVersion} · generated {timeAgo(p.predictionTimestamp)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-text-tertiary">No prediction yet.</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-secondary">Recent Relevant News</h2>
        {news.length === 0 ? (
          <div className="panel rounded-md p-4 text-sm text-text-tertiary">No recent news tagged for this asset.</div>
        ) : (
          <div className="panel flex flex-col divide-y divide-border rounded-md">
            {news.map((n: any) => (
              <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-bg-raised">
                <div>
                  <div>{n.title}</div>
                  <div className="text-xs text-text-tertiary">
                    {n.source} · {timeAgo(n.publishedAt)} · {n.eventType.replace(/_/g, " ")}
                  </div>
                </div>
                <span className={`font-data text-xs ${n.sentiment > 0 ? "text-bull" : n.sentiment < 0 ? "text-bear" : "text-text-tertiary"}`}>
                  {n.sentiment > 0 ? "+" : ""}
                  {n.sentiment.toFixed(2)}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel rounded-md p-4">
      <h3 className="mb-2 text-xs font-medium text-text-tertiary">{title}</h3>
      {children}
    </div>
  );
}
