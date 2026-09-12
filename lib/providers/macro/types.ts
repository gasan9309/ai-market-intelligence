export type MacroSeries = "DXY" | "VIX" | "US10Y";

export interface MacroQuote {
  series: MacroSeries;
  value: number;
  source: string;
  timestamp: Date;
}

export interface MacroDataProvider {
  name: string;
  fetchLatest(): Promise<MacroQuote[]>;
}
