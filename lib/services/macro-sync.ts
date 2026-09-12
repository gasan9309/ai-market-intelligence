import { db } from "@/lib/db/client";
import { macroSnapshots } from "@/lib/db/schema";
import { dbRun } from "@/lib/db/query";
import { getMacroDataProvider } from "@/lib/providers/macro";
import { resolveMode } from "@/lib/config";
import { newId } from "@/lib/util";
import { log } from "./logger";

export async function runMacroSync(): Promise<{ updated: number; errors: number }> {
  const mode = resolveMode();
  const provider = getMacroDataProvider();
  let updated = 0;
  let errors = 0;

  try {
    const quotes = await provider.fetchLatest();
    for (const q of quotes) {
      await dbRun(
        db.insert(macroSnapshots).values({
          id: newId("macro"),
          series: q.series,
          value: q.value,
          source: q.source,
          mode,
          timestamp: q.timestamp,
        })
      );
      updated++;
    }
  } catch (err) {
    log("error", "macro_sync", `Provider ${provider.name} failed`, { error: String(err) });
    errors++;
  }

  return { updated, errors };
}
