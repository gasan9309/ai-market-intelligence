"use client";

import { ASSETS } from "@/lib/config";
import { timeAgo } from "@/lib/format";

interface NewsItem {
  id: string;
  title: string;
  publishedAt: string;
  perAssetImpact: Record<string, { direction: string; impactScore: number }>;
}

function cellColor(score: number | undefined): string {
  if (score === undefined) return "text-text-tertiary";
  if (score > 0.4) return "text-bull font-semibold";
  if (score > 0.1) return "text-bull";
  if (score < -0.4) return "text-bear font-semibold";
  if (score < -0.1) return "text-bear";
  return "text-text-tertiary";
}

export function ImpactHeatmap({ items }: { items: NewsItem[] }) {
  const rows = items.filter((i) => Object.keys(i.perAssetImpact).length > 0).slice(0, 6);

  if (rows.length === 0) {
    return <div className="panel rounded-md p-4 text-sm text-text-tertiary">No scored market-impact events yet.</div>;
  }

  return (
    <div className="panel overflow-x-auto rounded-md">
      <table className="w-full min-w-[560px] border-collapse text-xs">
        <thead>
          <tr className="border-b hairline text-left text-text-tertiary">
            <th className="px-3 py-2 font-medium">Event</th>
            {ASSETS.map((a) => (
              <th key={a.symbol} className="px-3 py-2 text-right font-medium">
                {a.symbol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b hairline last:border-0">
              <td className="px-3 py-2">
                <div className="max-w-[280px] truncate">{r.title}</div>
                <div className="text-text-tertiary">{timeAgo(r.publishedAt)}</div>
              </td>
              {ASSETS.map((a) => {
                const impact = r.perAssetImpact[a.symbol];
                return (
                  <td key={a.symbol} className={`px-3 py-2 text-right font-data ${cellColor(impact?.impactScore)}`}>
                    {impact ? `${impact.impactScore > 0 ? "+" : ""}${impact.impactScore.toFixed(2)}` : "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
