import * as fs from "fs";
import * as path from "path";
import { pool } from "./db";

/**
 * Minimal startup migration runner.
 *
 * The project applies day-to-day schema changes with `drizzle-kit push`, which
 * is interactive and unsuitable for automated deployments. For changes that
 * must exist in production (like the MCP OAuth tables), we commit plain SQL
 * files under `migrations/` and run each exactly once at boot, tracked in a
 * `schema_migrations` table. Files must be idempotent anyway (IF NOT EXISTS)
 * as defense in depth.
 */
export async function runMigrations(): Promise<void> {
  const dir = path.resolve(process.cwd(), "migrations");
  if (!fs.existsSync(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name varchar(255) PRIMARY KEY,
         applied_at timestamp DEFAULT now()
       )`
    );
    for (const file of files) {
      const { rows } = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (rows.length > 0) continue;
      const sql = fs.readFileSync(path.join(dir, file), "utf-8");
      console.log(`Applying migration: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
