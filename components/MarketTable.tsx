import Link from "next/link";
import { AssetCardData } from "@/lib/services/dashboard";
import { formatPrice, formatPct, formatProb } from "@/lib/format";
import { SignalBadge } from "./SignalBadge";

const HORIZONS = ["1h", "4h", "24h"] as const;

export function MarketTable({ assets }: { assets: AssetCardData[] }) {
  return (
    <div className="panel overflow-x-auto rounded-md">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b hairline text-left text-xs text-text-tertiary">
            <th className="px-4 py-2.5 font-medium">Asset</th>
            <th className="px-4 py-2.5 font-medium">Price</th>
            <th className="px-4 py-2.5 font-medium">24H</th>
            {HORIZONS.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium uppercase">
                {h}
              </th>
            ))}
            <th className="px-4 py-2.5 font-medium">Probability</th>
            <th className="px-4 py-2.5 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => {
            const p1h = a.predictions["1h"];
            const changePositive = (a.change24h ?? 0) >= 0;
            return (
              <tr key={a.symbol} className="border-b hairline last:border-0 hover:bg-bg-raised">
                <td className="px-4 py-2.5">
                  <Link href={`/asset/${a.symbol}`} className="font-medium hover:text-accent">
                    {a.displaySymbol}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-data">${formatPrice(a.currentPrice, a.symbol)}</td>
                <td className={`px-4 py-2.5 font-data ${changePositive ? "text-bull" : "text-bear"}`}>
                  {formatPct(a.change24h)}
                </td>
                {HORIZONS.map((h) => {
                  const p = a.predictions[h];
                  return (
                    <td key={h} className="px-4 py-2.5">
                      {p ? <SignalBadge signal={p.signal} /> : <span className="text-text-tertiary">—</span>}
                    </td>
                  );
                })}
                <td className="px-4 py-2.5 font-data">{formatProb(p1h?.probabilityUp)}</td>
                <td className="px-4 py-2.5 text-xs text-text-secondary">{p1h?.confidenceLabel ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
