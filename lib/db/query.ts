import { databaseMode } from "./client";

export const isPostgres = databaseMode === "postgres";

/**
 * Run a select query and get all rows, regardless of backend.
 * SQLite (better-sqlite3 driver): query.all() is synchronous.
 * Postgres (node-postgres driver): the query object itself is a thenable
 * that resolves to the row array — no .all() method exists on it.
 */
export async function dbAll<T = any>(query: any): Promise<T[]> {
  return isPostgres ? await query : query.all();
}

/** Run a select query and get the first row (or undefined). */
export async function dbFirst<T = any>(query: any): Promise<T | undefined> {
  const rows = await dbAll<T>(query);
  return rows[0];
}

/** Run an insert/update/delete statement. Return value is not relied upon. */
export async function dbRun(query: any): Promise<void> {
  if (isPostgres) {
    await query;
  } else {
    query.run();
  }
}
