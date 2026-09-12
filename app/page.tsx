"use client";

import { useEffect, useRef } from "react";
import { usePolling, getJSON } from "@/lib/hooks";
import { StatusBar } from "@/components/StatusBar";
import { BtcIntelligencePanel } from "@/components/BtcIntelligencePanel";
import { AssetCard } from "@/components/AssetCard";
import { MarketTable } from "@/components/MarketTable";
import { NewsFeed } from "@/components/NewsFeed";
import { ImpactHeatmap } from "@/components/ImpactHeatmap";
import { AlertsPanel } from "@/components/AlertsPanel";
import { timeAgo } from "@/lib/format";

const INGEST_INTERVAL_MS = 60_000; // simulate a "1-5 min" tick, sped up for demo visibility
const DASHBOARD_REFRESH_MS = 15_000;
const NEWS_REFRESH_MS = 20_000;

export default function DashboardPage() {
  const dashboard = usePolling(() => getJSON<any>("/api/dashboard"), DASHBOARD_REFRESH_MS);
  const news = usePolling(() => getJSON<any>("/api/news?limit=20"), NEWS_REFRESH_MS);
  const kicked = useRef(false);

  useEffect(() => {
    // simulate the "background job" the spec asks for, since a serverless
    // deploy has no long-running process. In LIVE MODE, point a scheduler
    // (Vercel Cron) at POST /api/ingest instead of relying on this.
    if (!kicked.current) {
      kicked.current = true;
      fetch("/api/ingest", { method: "POST" }).catch(() => {});
    }
    const id = setInterval(() => {
      fetch("/api/ingest", { method: "POST" }).catch(() => {});
    }, INGEST_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const assets = dashboard.data?.assets ?? [];
  const newsItems = news.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <StatusBar />
      <BtcIntelligencePanel />

      <section>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {assets.length > 0
            ? assets.map((a: any) => <AssetCard key={a.symbol} asset={a} />)
            : Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="panel h-[150px] animate-pulse rounded-md" />
              ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">Market Overview</h2>
            <MarketTable assets={assets} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">Market Impact — Recent Events</h2>
            <ImpactHeatmap items={newsItems} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">Alerts</h2>
            <AlertsPanel alerts={dashboard.data?.alerts ?? []} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-text-secondary">Live News Feed</h2>
          <NewsFeed items={newsItems} />
        </div>
      </section>

      <p className="text-xs text-text-tertiary">
        Signals are model estimates, not certainties. Last dashboard refresh {timeAgo(dashboard.data?.timestamp)}.
      </p>
    </div>
  );
}
