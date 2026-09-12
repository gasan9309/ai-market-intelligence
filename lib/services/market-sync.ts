import { db } from "@/lib/db/client";
import { marketSnapshots } from "@/lib/db/schema";
import { dbRun } from "@/lib/db/query";
import { getMarketDataProviders } from "@/lib/providers/market";
import { ASSETS, resolveMode } from "@/lib/config";
import { newId } from "@/lib/util";
import { log } from "./logger";

export async function runMarketSync(): Promise<{ updated: number; errors: number }> {
  const mode = resolveMode();
  const providers = getMarketDataProviders();
  const allSymbols = ASSETS.map((a) => a.symbol);
  let updated = 0;
  let errors = 0;
  const covered = new Set<string>();

  for (const provider of providers) {
    const symbolsForProvider = allSymbols.filter((s) => !covered.has(s) && (provider.supports.length === 0 || provider.supports.includes(s)));
    if (symbolsForProvider.length === 0) continue;

    try {
      const quotes = await provider.fetchQuotes(symbolsForProvider);
      for (const q of quotes) {
        if (!q.price || isNaN(q.price)) continue;
        await dbRun(
          db.insert(marketSnapshots).values({
            id: newId("snap"),
            asset: q.asset,
            price: q.price,
            volume: q.volume ?? null,
            source: q.source,
            mode,
            timestamp: q.timestamp,
          })
        );
        covered.add(q.asset);
        updated++;
      }
    } catch (err) {
      log("error", "market_sync", `Provider ${provider.name} failed`, { error: String(err) });
      errors++;
    }
  }

  const missing = allSymbols.filter((s) => !covered.has(s));
  if (missing.length > 0) {
    log("warn", "market_sync", `No fresh quote for: ${missing.join(", ")} — dashboard will show last known price.`);
  }

  return { updated, errors };
}
