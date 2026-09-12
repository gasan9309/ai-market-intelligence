import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "market-intel.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
const sql = fs.readFileSync(path.join(process.cwd(), "lib", "db", "init.sql"), "utf-8");
sqlite.exec(sql);

// SQLite has no "ADD COLUMN IF NOT EXISTS", so for a DB file that already
// existed before a given column was introduced, add it defensively here
// (CREATE TABLE IF NOT EXISTS above is a no-op for tables that already
// exist). Safe to run repeatedly — each ALTER is skipped if the column is
// already present.
const columnAdditions: [string, string, string][] = [
  ["predictions", "mode", "TEXT NOT NULL DEFAULT 'demo'"],
  ["prediction_results", "absolute_return", "REAL"],
  ["prediction_results", "maximum_favorable_move", "REAL"],
  ["prediction_results", "maximum_adverse_move", "REAL"],
  ["model_versions", "status", "TEXT NOT NULL DEFAULT 'BASELINE'"],
  ["paper_trades", "fees_pct", "REAL NOT NULL DEFAULT 0.001"],
  ["paper_trades", "slippage_pct", "REAL NOT NULL DEFAULT 0.0005"],
  ["features", "dxy_value", "REAL"],
  ["features", "dxy_change", "REAL"],
  ["features", "vix_value", "REAL"],
  ["features", "vix_change", "REAL"],
  ["features", "us10y_value", "REAL"],
  ["features", "us10y_change", "REAL"],
  ["features", "btc_eth_ratio", "REAL"],
];

for (const [table, column, definition] of columnAdditions) {
  const existing = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!existing.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  added missing column ${table}.${column}`);
  }
}

console.log(`Migrated schema into ${DB_PATH}`);
sqlite.close();
