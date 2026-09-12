"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/format";

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  url: string;
  publishedAt: string;
  eventType: string;
  sentiment: number;
  importance: number;
  novelty: number;
  reason: string;
  assets: string[];
  perAssetImpact: Record<string, { direction: string; impactScore: number; confidence: number }>;
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return <div className="panel rounded-md p-4 text-sm text-text-tertiary">No news analyzed yet — waiting for the next ingestion tick.</div>;
  }

  return (
    <div className="panel flex flex-col divide-y divide-border rounded-md">
      {items.map((item) => {
        const open = openId === item.id;
        const sentimentColor = item.sentiment > 0.1 ? "text-bull" : item.sentiment < -0.1 ? "text-bear" : "text-text-tertiary";
        return (
          <div key={item.id} className="px-4 py-3">
            <button
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex w-full flex-col gap-1.5 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-tertiary">
                  {timeAgo(item.publishedAt)} · {item.source} · {item.eventType.replace(/_/g, " ")}
                </span>
                <span className={`font-data text-xs ${sentimentColor}`}>
                  {item.sentiment > 0 ? "+" : ""}
                  {item.sentiment.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">{item.title}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                <span>Affected: {item.assets.join(", ") || "none detected"}</span>
                <span>Importance {Math.round(item.importance * 100)}%</span>
                <span>Novelty {Math.round(item.novelty * 100)}%</span>
              </div>
            </button>

            {open && (
              <div className="mt-3 rounded border hairline bg-bg-raised p-3 text-xs">
                <p className="mb-2 text-text-secondary">{item.reason}</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {Object.entries(item.perAssetImpact).map(([asset, impact]) => (
                    <span
                      key={asset}
                      className={`rounded border px-2 py-0.5 font-data ${
                        impact.direction === "positive"
                          ? "border-[#1c4a2f] text-bull"
                          : impact.direction === "negative"
                          ? "border-[#59301f] text-bear"
                          : "border-border text-text-tertiary"
                      }`}
                    >
                      {asset} {impact.impactScore > 0 ? "+" : ""}
                      {impact.impactScore.toFixed(2)}
                    </span>
                  ))}
                </div>
                <a href={item.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  Open original article ↗
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
