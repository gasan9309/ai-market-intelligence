import Link from "next/link";
import { AssetCardData } from "@/lib/services/dashboard";
import { formatPrice, formatPct, formatProb } from "@/lib/format";
import { SignalBadge, ConfidenceTag } from "./SignalBadge";

export function AssetCard({ asset }: { asset: AssetCardData }) {
  const p1h = asset.predictions["1h"];
  const changePositive = (asset.change24h ?? 0) >= 0;

  return (
    <Link
      href={`/asset/${asset.symbol}`}
      className="panel flex flex-col gap-3 rounded-md p-4 transition-colors hover:border-text-tertiary"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold">{asset.displaySymbol}</div>
          <div className="text-xs text-text-tertiary">{asset.name}</div>
        </div>
        <div className="text-right">
          <div className="font-data text-lg font-medium">${formatPrice(asset.currentPrice, asset.symbol)}</div>
          <div className={`font-data text-xs ${changePositive ? "text-bull" : "text-bear"}`}>
            24H {formatPct(asset.change24h)}
          </div>
        </div>
      </div>

      {p1h ? (
        <div className="border-t hairline pt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">1H FORECAST</span>
            <SignalBadge signal={p1h.signal} />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-data text-2xl font-semibold">{formatProb(p1h.probabilityUp)}</span>
            <ConfidenceTag label={p1h.confidenceLabel} />
          </div>
        </div>
      ) : (
        <div className="border-t hairline pt-3 text-xs text-text-tertiary">No prediction yet</div>
      )}

      <div className="flex gap-3 text-xs text-text-tertiary">
        {(["4h", "24h"] as const).map((h) => {
          const p = asset.predictions[h];
          return (
            <div key={h} className="flex items-center gap-1.5">
              <span className="uppercase">{h}</span>
              {p ? <SignalBadge signal={p.signal} /> : <span>—</span>}
            </div>
          );
        })}
      </div>
    </Link>
  );
}
