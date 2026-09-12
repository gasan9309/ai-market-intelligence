import { getDatabaseMode } from "./mode";
import { resolveMode } from "@/lib/config";

/**
 * `db` is intentionally typed loosely (see schema.ts for why): it is either
 * a better-sqlite3-backed Drizzle instance or a node-postgres-backed one,
 * chosen once per process from DATABASE_MODE. All query code goes through
 * lib/db/query.ts's dbAll/dbGet/dbRun helpers specifically so it works
 * against either.
 */
let db: any;
let closeFn: () => void = () => {};

const mode = getDatabaseMode();

// AUDIT FIX (item 4): SQLite is strictly a demo/local backend. If the
// system MODE resolves to anything other than "demo" while the database
// backend is SQLite, fail fast at startup instead of quietly running a
// "live" deployment against a throwaway local file (which also does not
// survive Vercel's serverless filesystem between invocations).
const systemMode = resolveMode();
if (mode === "sqlite" && systemMode !== "demo") {
  throw new Error(
    `Refusing to start: MODE="${systemMode}" but DATABASE_MODE resolved to "sqlite". ` +
      `SQLite is for DEMO/local use only. Set DATABASE_MODE=postgres and DATABASE_URL ` +
      `(e.g. your Supabase connection string) before running in live or data-collection mode.`
  );
}

if (mode === "postgres") {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_MODE=postgres (or DATABASE_URL is set) but DATABASE_URL is missing. Set it to your Supabase/Neon/Postgres connection string."
    );
  }
  // Lazy require so `pg` and its native deps are never touched when running
  // in sqlite mode (keeps the demo/local path dependency-free).
  const { Pool } = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");

  const connectionString = process.env.DATABASE_URL;
  const wantsSsl =
    process.env.PGSSL === "true" ||
    (process.env.PGSSL !== "false" && (connectionString.includes("supabase.co") || connectionString.includes("sslmode=require")));

  const pool = new Pool({
    connectionString,
    // Supabase's pooled connection endpoint requires SSL; local/dev
    // Postgres (including the one this app was verified against) does not
    // enable SSL by default, so we only turn it on when the connection
    // string looks like a hosted Supabase/require-ssl endpoint, or PGSSL
    // is set explicitly.
    ssl: wantsSsl ? { rejectUnauthorized: false } : false,
    max: 5,
  });

  db = drizzle(pool);
  closeFn = () => void pool.end();
} else {
  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const path = require("path");

  const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "market-intel.db");
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");

  db = drizzle(sqlite);
  closeFn = () => sqlite.close();
}

export { db };
export const databaseMode = mode;
export function closeDb() {
  closeFn();
}
