import { NewsAnalysisResult, RawNewsArticle } from "@/lib/types";

export interface AIAnalyzer {
  name: string;
  analyze(article: RawNewsArticle): Promise<NewsAnalysisResult>;
}
