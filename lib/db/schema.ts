import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";
import { getDatabaseMode } from "./mode";

/**
 * Dual-dialect facade.
 *
 * Drizzle's query builder is dialect-typed (SQLiteTable vs PgTable), but
 * this app picks its dialect at RUNTIME via DATABASE_MODE, not at build
 * time — so every table export here is intentionally loosely typed (`any`)
 * rather than being one dialect's exact type. This is a deliberate,
 * narrow trade-off at this one boundary (schema + db client), made so that
 * none of the ~20 existing service/route files that do
 * `import { marketSnapshots } from "@/lib/db/schema"` had to change their
 * imports or query code to support a second backend. Query correctness is
 * still checked at runtime against whichever real database is configured,
 * and both schema.sqlite.ts and schema.pg.ts are kept column-for-column
 * identical so behavior doesn't diverge between modes.
 */
const active = getDatabaseMode() === "postgres" ? pgSchema : sqliteSchema;

export const assets: any = active.assets;
export const newsArticles: any = active.newsArticles;
export const newsAnalysis: any = active.newsAnalysis;
export const marketSnapshots: any = active.marketSnapshots;
export const features: any = active.features;
export const predictions: any = active.predictions;
export const predictionResults: any = active.predictionResults;
export const modelVersions: any = active.modelVersions;
export const backtests: any = active.backtests;
export const systemLogs: any = active.systemLogs;
export const paperTrades: any = active.paperTrades;
export const macroSnapshots: any = active.macroSnapshots;
