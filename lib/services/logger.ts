import { db } from "@/lib/db/client";
import { systemLogs } from "@/lib/db/schema";
import { dbRun } from "@/lib/db/query";
import { newId } from "@/lib/util";

export type LogScope =
  | "news_ingestion"
  | "ai_analysis"
  | "prediction"
  | "market_sync"
  | "api_error"
  | "evaluation"
  | "backtest"
  | "macro_sync"
  | "data_collection"
  | "ingestion_lock";

/**
 * Kept synchronous-looking on purpose (best-effort, fire-and-forget) even
 * though the underlying write is async under Postgres — logging must never
 * block or fail the pipeline it's observing. Errors writing the log itself
 * are swallowed (and printed) rather than thrown.
 */
export function log(level: "info" | "warn" | "error", scope: LogScope, message: string, meta?: unknown) {
  try {
    const insert = db.insert(systemLogs).values({
      id: newId("log"),
      level,
      scope,
      message,
      meta: meta ? JSON.stringify(meta) : null,
      timestamp: new Date(),
    });
    void dbRun(insert).catch((err) => console.error("[logger] failed to write log:", err));
  } catch (err) {
    console.error("[logger] failed to write log:", err);
  }
  if (level === "error") console.error(`[${scope}] ${message}`, meta ?? "");
}
