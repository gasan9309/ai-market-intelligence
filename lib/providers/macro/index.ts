import { MacroDataProvider } from "./types";
import { DemoMacroProvider } from "./demo";
import { FredMacroProvider } from "./fred";
import { resolveMode } from "@/lib/config";

export function getMacroDataProvider(): MacroDataProvider {
  const mode = resolveMode();
  if (mode === "demo") return new DemoMacroProvider();
  if (process.env.FRED_API_KEY) return new FredMacroProvider(process.env.FRED_API_KEY);
  // No macro key configured — return an empty provider rather than demo
  // data, so live mode never silently mixes in synthetic macro numbers.
  return { name: "none", fetchLatest: async () => [] };
}

export type { MacroDataProvider };
