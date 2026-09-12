import { MacroDataProvider, MacroQuote, MacroSeries } from "./types";
import { db } from "@/lib/db/client";
import { macroSnapshots } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { dbFirst } from "@/lib/db/query";

const SEED: Record<MacroSeries, { value: number; vol: number }> = {
  DXY: { value: 104.2, vol: 0.0015 },
  VIX: { value: 15.5, vol: 0.03 },
  US10Y: { value: 4.25, vol: 0.006 },
};

export class DemoMacroProvider implements MacroDataProvider {
  name = "demo";

  async fetchLatest(): Promise<MacroQuote[]> {
    const now = new Date();
    const quotes: MacroQuote[] = [];

    for (const series of Object.keys(SEED) as MacroSeries[]) {
      const last = await dbFirst<{ value: number }>(
        db.select().from(macroSnapshots).where(eq(macroSnapshots.series, series)).orderBy(desc(macroSnapshots.timestamp)).limit(1)
      );
      const seed = SEED[series];
      const lastValue = last?.value ?? seed.value;
      const noise = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const value = Math.max(0.01, lastValue * (1 + noise * seed.vol));

      quotes.push({ series, value: Math.round(value * 100) / 100, source: "demo", timestamp: now });
    }

    return quotes;
  }
}
