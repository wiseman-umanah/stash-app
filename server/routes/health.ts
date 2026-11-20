import { sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { route } from "../http.js";

/** GET /api/health — checks the API can reach the database. */
export const GET = route(async () => {
  await getDb().execute(sql`select 1`);
  return { ok: true };
});
