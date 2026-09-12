import { MacroDataProvider, MacroQuote, MacroSeries } from "./types";

/**
 * FRED (Federal Reserve Economic Data) is free with an API key
 * (https://fred.stlouisfed.org/docs/api/api_key.html) and is the most
 * reliable free source for these specific series:
 *   - DTWEXBGS: Trade Weighted U.S. Dollar Index, Broad (daily) — DXY proxy
 *   - VIXCLS:   CBOE Volatility Index (daily close)
 *   - DGS10:    10-Year Treasury Constant Maturity Rate (daily)
 * These are daily series (not intraday), which is an honest limitation for
 * a "real-time" dashboard — documented in README. Untested against the
 * real fred.stlouisfed.org endpoint in this build environment (outbound
 * network here is restricted to package registries) but implemented
 * directly against FRED's documented REST API.
 */
const FRED_SERIES: Record<MacroSeries, string> = {
  DXY: "DTWEXBGS",
  VIX: "VIXCLS",
  US10Y: "DGS10",
};

export class FredMacroProvider implements MacroDataProvider {
  name = "fred";
  constructor(private apiKey: string) {}

  async fetchLatest(): Promise<MacroQuote[]> {
    const now = new Date();
    const results: MacroQuote[] = [];

    for (const [series, fredId] of Object.entries(FRED_SERIES) as [MacroSeries, string][]) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${fredId}&api_key=${this.apiKey}&file_type=json&sort_order=desc&limit=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const obs = data.observations?.[0];
        const value = parseFloat(obs?.value);
        if (obs && !isNaN(value)) {
          results.push({ series, value, source: "fred", timestamp: now });
        }
      } catch (err) {
        console.error(`[FredMacroProvider] failed for ${series}:`, (err as Error).message);
      }
    }

    return results;
  }
}
