/**
 * Applies the Postgres schema (lib/db/init.postgres.sql) against
 * DATABASE_URL. Works against Supabase, Neon, or any Postgres instance —
 * this project was verified against a locally-installed Postgres 16
 * during development since this build environment has no network path to
 * a hosted Supabase project; the SQL is plain, portable DDL with no
 * Supabase-specific syntax.
 *
 * Run with: npm run db:migrate:postgres
 */
import { Client } from "pg";
import fs from "fs";
import path from "path";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Point it at your Supabase/Neon/Postgres connection string.");
    process.exit(1);
  }

  const wantsSsl =
    process.env.PGSSL === "true" ||
    (process.env.PGSSL !== "false" && (connectionString.includes("supabase.co") || connectionString.includes("sslmode=require")));

  const client = new Client({
    connectionString,
    ssl: wantsSsl ? { rejectUnauthorized: false } : false,
  });

  const sql = fs.readFileSync(path.join(process.cwd(), "lib", "db", "init.postgres.sql"), "utf-8");

  await client.connect();
  try {
    await client.query(sql);
    console.log(`Migrated Postgres schema successfully (ssl=${wantsSsl}).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Postgres migration failed:", err);
  process.exit(1);
});
