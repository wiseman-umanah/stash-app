import { eq } from "drizzle-orm";
import type { LoginRequest } from "../../../src/data/types.js";
import { normalizePhone, startSession, verifyPassword } from "../../auth.js";
import { getDb, schema } from "../../db/client.js";
import { HttpError, json, readJson, route } from "../../http.js";

/** POST /api/auth/login { phone, password } */
export const POST = route(async (request) => {
  const body = await readJson<Partial<LoginRequest>>(request);
  const phone = normalizePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  const [user] = await getDb()
    .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.phone, phone))
    .limit(1);
  // same message either way, so the form doesn't reveal which phones have accounts
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Wrong phone number or password.");
  }
  return json({ ok: true }, { headers: { "Set-Cookie": await startSession(request, user.id) } });
});
