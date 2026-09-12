export type DatabaseMode = "sqlite" | "postgres";

/**
 * DATABASE_MODE is independent of MODE (live/demo/data_collection):
 * you can run DEMO data against Postgres, or (less usefully) LIVE mode
 * against a local SQLite file. In practice: sqlite for local/demo,
 * postgres for any real deployment (Supabase/Neon on Vercel), because
 * SQLite's on-disk file does not survive serverless invocations.
 */
export function getDatabaseMode(): DatabaseMode {
  const explicit = process.env.DATABASE_MODE?.toLowerCase();
  if (explicit === "postgres") return "postgres";
  if (explicit === "sqlite") return "sqlite";
  // default: postgres only if a connection string is actually present,
  // otherwise sqlite — never silently fail to connect.
  return process.env.DATABASE_URL ? "postgres" : "sqlite";
}
