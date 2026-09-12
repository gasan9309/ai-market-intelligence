import { NewsProvider } from "./types";
import { RawNewsArticle } from "@/lib/types";
import { newId } from "@/lib/util";

/**
 * NewsAPI.org provider. Requires NEWS_API_KEY. Untested in this sandbox
 * (no outbound access to newsapi.org here) but implemented against their
 * documented /v2/everything contract.
 */
export class NewsApiProvider implements NewsProvider {
  name = "newsapi";
  constructor(private apiKey: string) {}

  async fetchLatest(): Promise<RawNewsArticle[]> {
    const query = encodeURIComponent(
      "(bitcoin OR ethereum OR crypto OR \"federal reserve\" OR inflation OR \"interest rate\" OR gold OR \"S&P 500\" OR forex)"
    );
    const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=30`;

    const res = await fetch(url, { headers: { "X-Api-Key": this.apiKey } });
    if (!res.ok) throw new Error(`NewsAPI error: HTTP ${res.status}`);
    const data = await res.json();

    return (data.articles || []).map(
      (a: any): RawNewsArticle => ({
        id: newId("news"),
        title: a.title,
        description: a.description || null,
        source: a.source?.name || "NewsAPI",
        url: a.url,
        publishedAt: new Date(a.publishedAt),
        language: "en",
        rawText: a.content || a.description || null,
        provider: "newsapi",
      })
    );
  }
}
