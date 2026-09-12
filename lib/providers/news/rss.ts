import { XMLParser } from "fast-xml-parser";
import { NewsProvider } from "./types";
import { RawNewsArticle } from "@/lib/types";
import { newId } from "@/lib/util";

/**
 * Real, working RSS provider — no API key required. Reads a configurable
 * list of public financial RSS feeds. This is the "Secondary" source from
 * the spec and also works as a genuinely-live fallback when no NEWS_API_KEY
 * is set but MODE=live is forced.
 *
 * Note: outbound fetch() to these feed hosts is not exercised inside this
 * build sandbox (network egress here is restricted to package registries),
 * but the implementation is standard fetch + XML parsing and will work
 * as-is once deployed to Vercel.
 */
const DEFAULT_FEEDS: { url: string; source: string }[] = [
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/", source: "MarketWatch" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC" },
  { url: "https://finance.yahoo.com/news/rssindex", source: "Yahoo Finance" },
];

export class RssNewsProvider implements NewsProvider {
  name = "rss";
  private feeds: { url: string; source: string }[];

  constructor(feeds: { url: string; source: string }[] = DEFAULT_FEEDS) {
    this.feeds = feeds;
  }

  async fetchLatest(): Promise<RawNewsArticle[]> {
    const parser = new XMLParser({ ignoreAttributes: false });
    const results: RawNewsArticle[] = [];

    await Promise.all(
      this.feeds.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            headers: { "User-Agent": "AI-Market-Intelligence/0.1 (+demo)" },
            // RSS content changes slowly enough that a short cache is fine
            next: { revalidate: 60 },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const xml = await res.text();
          const doc = parser.parse(xml);
          const items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
          const arr = Array.isArray(items) ? items : [items];

          for (const item of arr.slice(0, 15)) {
            const title = stripCdata(item.title);
            const description = stripCdata(item.description || item.summary || "");
            const link = typeof item.link === "string" ? item.link : item.link?.["@_href"] || item.link?.["#text"];
            const pubDateRaw = item.pubDate || item.published || item.updated;
            if (!title || !link || !pubDateRaw) continue;

            const publishedAt = new Date(pubDateRaw);
            // Spec requirement: never use retrieval time as publication
            // time. If the feed doesn't give a parseable publish date, skip
            // the item rather than guessing "now".
            if (isNaN(publishedAt.getTime())) continue;

            results.push({
              id: newId("news"),
              title,
              description: description || null,
              source: feed.source,
              url: link,
              publishedAt,
              language: "en",
              rawText: description || null,
              provider: `rss:${feed.source}`,
            });
          }
        } catch (err) {
          // Individual feed failures shouldn't take down ingestion.
          console.error(`[RssNewsProvider] failed to fetch ${feed.url}:`, (err as Error).message);
        }
      })
    );

    return results;
  }
}

function stripCdata(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}
