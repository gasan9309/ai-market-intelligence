import { db } from "@/lib/db/client";
import { systemLogs } from "@/lib/db/schema";
import { dbAll, dbRun } from "@/lib/db/query";
import { desc, eq } from "drizzle-orm";
import { newId } from "@/lib/util";
import { log } from "./logger";

const LOCK_MESSAGE = "tick_start";
// Shorter than the spec's 1-5 minute recommended cron interval, so a
// legitimate scheduled tick is never blocked by the previous one, but a
// human (or misconfigured cron) firing the endpoint twice in quick
// succession is.
const MIN_INTERVAL_MS = 20_000;

/**
 * AUDIT FIX (item 13): a simple, DB-backed debounce so the same ingestion
 * tick can't run twice back-to-back. Not a distributed lock (two requests
 * arriving within milliseconds of each other could both pass the check
 * before either writes its marker) — documented as a known limitation.
 * For the actual cron cadence this is built for (>=1 minute between
 * ticks), this is sufficient and avoids adding lock-service infrastructure
 * for an MVP.
 */
export async function tryAcquireIngestionLock(): Promise<{ acquired: boolean; lastStartedAt: Date | null }> {
  const recent = await dbAll<{ timestamp: Date }>(
    db.select({ timestamp: systemLogs.timestamp }).from(systemLogs).where(eq(systemLogs.scope, "ingestion_lock")).orderBy(desc(systemLogs.timestamp)).limit(1)
  );
  const last = recent[0]?.timestamp ?? null;

  if (last && Date.now() - last.getTime() < MIN_INTERVAL_MS) {
    return { acquired: false, lastStartedAt: last };
  }

  await dbRun(
    db.insert(systemLogs).values({
      id: newId("log"),
      level: "info",
      scope: "ingestion_lock",
      message: LOCK_MESSAGE,
      meta: null,
      timestamp: new Date(),
    })
  );
  return { acquired: true, lastStartedAt: last };
}
