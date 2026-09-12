"use client";

import { usePolling, getJSON } from "@/lib/hooks";
import { timeAgo, formatClock } from "@/lib/format";

interface StatusResponse {
  mode: "live" | "demo" | "data_collection";
  components: Record<string, { connected: boolean; label: string }>;
  lastNewsUpdate: string | null;
  lastMarketUpdate: string | null;
}

const MODE_LABEL: Record<StatusResponse["mode"], string> = {
  live: "LIVE MODE",
  demo: "DEMO MODE",
  data_collection: "DATA COLLECTION MODE",
};

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-bull" : "bg-bear"}`} />;
}

export function StatusBar() {
  const { data } = usePolling<StatusResponse>(() => getJSON("/api/status"), 20_000);

  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 font-semibold tracking-wide ${
            data?.mode === "live" ? "bg-[#12301f] text-bull" : data?.mode === "data_collection" ? "bg-[#1c2740] text-[#6fa8ff]" : "bg-[#2b2415] text-accent"
          }`}
        >
          {data ? MODE_LABEL[data.mode] : "LOADING"}
        </span>
        {data?.mode === "demo" && <span className="text-text-tertiary">Simulated data — not real market feeds</span>}
        {data?.mode === "data_collection" && <span className="text-text-tertiary">Collecting real data for future training — no trades executed</span>}
      </div>
      {data &&
        Object.entries(data.components).map(([key, c]) => (
          <div key={key} className="flex items-center gap-1.5 text-text-secondary">
            <Dot ok={c.connected} />
            <span className="uppercase text-text-tertiary">{key.replace(/([A-Z])/g, " $1")}</span>
            <span>{c.label}</span>
          </div>
        ))}
      <div className="ml-auto flex items-center gap-4 text-text-tertiary">
        <span>News: {data ? `${formatClock(data.lastNewsUpdate)} (${timeAgo(data.lastNewsUpdate)})` : "—"}</span>
        <span>Market: {data ? `${formatClock(data.lastMarketUpdate)} (${timeAgo(data.lastMarketUpdate)})` : "—"}</span>
      </div>
    </div>
  );
}
