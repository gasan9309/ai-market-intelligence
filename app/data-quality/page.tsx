"use client";

import { usePolling, getJSON } from "@/lib/hooks";
import { timeAgo } from "@/lib/format";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-text-tertiary">{label}</div>
      <div className="font-data text-lg">{value}</div>
    </div>
  );
}

export default function DataQualityPage() {
  const { data, loading } = usePolling(() => getJSON<any>("/api/data-quality"), 20_000);
  const report = data?.report;
  const readinessByAsset = data?.readinessByAsset ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Data Quality</h1>
        <p className="text-sm text-text-tertiary">
          LIVE/DATA COLLECTION data is shown separately from DEMO (synthetic) data. Demo data never counts toward
          model training readiness.
        </p>
      </div>

      {loading && !report && <div className="panel h-40 animate-pulse rounded-md" />}

      {report && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {report.buckets.map((b: any) => (
              <div key={b.mode} className="panel rounded-md p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase">{b.mode === "demo" ? "Demo Data" : "Real Data (Live + Data Collection)"}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="News articles" value={b.newsArticles} />
                  <Metric label="Analyzed news" value={b.analyzedNews} />
                  <Metric label="Market snapshots" value={b.marketSnapshots} />
                  <Metric label="Predictions" value={b.predictions} />
                  <Metric label="Evaluated predictions" value={b.evaluatedPredictions} />
                </div>
              </div>
            ))}
          </div>

          <div className="panel grid grid-cols-2 gap-4 rounded-md p-4 sm:grid-cols-4">
            <Metric label="Duplicate news blocked" value={report.duplicateNewsBlocked} />
            <Metric label="Failed provider requests" value={report.failedProviderRequests} />
            <Metric label="Failed AI analyses" value={report.failedAiAnalyses} />
            <Metric label="Last news ingestion" value={timeAgo(report.lastNewsIngestion)} />
          </div>
          <div className="panel grid grid-cols-1 gap-4 rounded-md p-4 sm:grid-cols-4">
            <Metric label="Last market ingestion" value={timeAgo(report.lastMarketIngestion)} />
            {Object.entries(report.realSamplesByHorizon).map(([h, n]) => (
              <Metric key={h} label={`Real samples — ${h}`} value={n as number} />
            ))}
          </div>
        </>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Model Training Readiness</h2>
        <p className="mb-3 text-sm text-text-tertiary">
          Based only on real (non-demo) evaluated predictions. Reaching the threshold does not trigger training
          automatically.
        </p>
        <div className="flex flex-col gap-4">
          {readinessByAsset.map((row: any) => (
            <div key={row.asset} className="panel rounded-md p-4">
              <h3 className="mb-3 text-sm font-semibold">{row.displaySymbol}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {row.readiness.map((r: any) => (
                  <div key={r.horizon} className="rounded border hairline p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs uppercase text-text-tertiary">{r.horizon}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          r.status === "READY_FOR_TRAINING" ? "bg-[#12301f] text-bull" : "bg-bg-raised text-text-tertiary"
                        }`}
                      >
                        {r.status === "READY_FOR_TRAINING" ? "READY FOR TRAINING" : "NOT READY"}
                      </span>
                    </div>
                    <div className="font-data text-lg">{r.realLabeledSamples.toLocaleString()}</div>
                    <div className="text-[10px] text-text-tertiary">min. required: {r.minRequired.toLocaleString()}</div>
                    {r.classBalance && (
                      <div className="mt-1 text-[10px] text-text-tertiary">
                        UP {r.classBalance.up} / DOWN {r.classBalance.down}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
