import { NewsProvider } from "./types";
import { DemoNewsProvider } from "./demo";
import { NewsApiProvider } from "./newsapi";
import { RssNewsProvider } from "./rss";
import { resolveMode } from "@/lib/config";

/**
 * Single place that decides which NewsProvider(s) back the app.
 * To add Bloomberg later: implement NewsProvider in a new file and add one
 * line here — nothing else in the app changes.
 */
export function getNewsProviders(): NewsProvider[] {
  const mode = resolveMode();
  if (mode === "demo") return [new DemoNewsProvider()];

  const providers: NewsProvider[] = [];
  if (process.env.NEWS_API_KEY) providers.push(new NewsApiProvider(process.env.NEWS_API_KEY));
  providers.push(new RssNewsProvider()); // secondary source, always available
  return providers;
}

export type { NewsProvider };
