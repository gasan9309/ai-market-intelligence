import { NewsProvider } from "./types";
import { RawNewsArticle } from "@/lib/types";
import { HEADLINE_POOL } from "./headline-pool";
import { newId } from "@/lib/util";

/**
 * DemoNewsProvider simulates a live feed by releasing a small random subset
 * of the seeded headline pool on each call, each with a fresh timestamp and
 * light text jitter so hashes/dedup behave like a real feed. It never
 * claims to be live data (mode="demo" is stamped by the caller).
 */
export class DemoNewsProvider implements NewsProvider {
  name = "demo";

  async fetchLatest(): Promise<RawNewsArticle[]> {
    const now = new Date();
    const count = 1 + Math.floor(Math.random() * 3); // 1-3 new items per poll
    const picks = shuffle(HEADLINE_POOL).slice(0, count);

    return picks.map((h) => {
      const publishedAt = new Date(now.getTime() - Math.floor(Math.random() * 3 * 60_000));
      return {
        id: newId("news"),
        title: h.title,
        description: h.description,
        source: h.source,
        url: `https://example-demo-feed.local/${encodeURIComponent(h.title)}-${publishedAt.getTime()}`,
        publishedAt,
        language: "en",
        rawText: h.description,
        provider: "demo",
      } satisfies RawNewsArticle;
    });
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
