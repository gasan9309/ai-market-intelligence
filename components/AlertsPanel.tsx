import { timeAgo } from "@/lib/format";

interface Alert {
  id: string;
  type: string;
  asset: string;
  message: string;
  timestamp: string;
}

const TYPE_LABEL: Record<string, string> = {
  signal_change: "Signal change",
  breaking_news: "Breaking news",
  sentiment_shift: "Sentiment shift",
  market_move: "Market move",
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return <div className="panel rounded-md p-4 text-sm text-text-tertiary">No alerts right now.</div>;
  }
  return (
    <div className="panel flex flex-col divide-y divide-border rounded-md">
      {alerts.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
          <div>
            <span className="mr-2 text-xs text-text-tertiary">{TYPE_LABEL[a.type] ?? a.type}</span>
            <span>{a.message}</span>
          </div>
          <span className="shrink-0 text-xs text-text-tertiary">{timeAgo(a.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}
