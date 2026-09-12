import { RawNewsArticle } from "@/lib/types";

/**
 * Swap-in abstraction: NewsAPI, RSS, or a future Bloomberg provider all
 * implement this same interface. Nothing above this layer knows or cares
 * which concrete provider produced the articles.
 */
export interface NewsProvider {
  name: string;
  /** Fetch the latest batch of candidate articles. Providers do their own
   * pagination/limits internally; callers just get "what's new". */
  fetchLatest(): Promise<RawNewsArticle[]>;
}
