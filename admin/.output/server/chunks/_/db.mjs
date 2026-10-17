import { u as useRuntimeConfig, c as createError } from '../nitro/nitro.mjs';
import pg from 'pg';

pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (s) => /* @__PURE__ */ new Date(s.replace(" ", "T") + "Z"));
pg.types.setTypeParser(pg.types.builtins.DATE, (s) => s);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (s) => Number.parseFloat(s));
let pool;
function getPool() {
  if (!pool) {
    const { databaseUrl } = useRuntimeConfig();
    if (!databaseUrl) throw createError({ statusCode: 500, statusMessage: "Admin database is not configured" });
    pool = new pg.Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 3e4 });
    pool.on("error", (err) => console.error("[admin] pg pool error:", err.message));
  }
  return pool;
}
async function sql(text, params = []) {
  const { rows } = await getPool().query(text, params);
  return rows;
}
async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(async (text, params = []) => (await client.query(text, params)).rows);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export { sql as s, transaction as t };
//# sourceMappingURL=db.mjs.map
