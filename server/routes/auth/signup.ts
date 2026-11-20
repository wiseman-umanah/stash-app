import type { SignupRequest } from "../../../src/data/types.js";
import { hashPassword, normalizePhone, startSession, validatePassword } from "../../auth.js";
import { getDb, schema } from "../../db/client.js";
import { HttpError, json, readJson, route } from "../../http.js";
import { eq } from "drizzle-orm";

const text = (v: unknown, field: string, max = 80) => {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `${field} is required.`);
  if (v.trim().length > max) throw new HttpError(400, `${field} is too long.`);
  return v.trim();
};

/** POST /api/auth/signup — creates a business + owner account and signs them in. */
export const POST = route(async (request) => {
  const body = await readJson<Partial<SignupRequest>>(request);
  const ownerName = text(body.ownerName, "Your name");
  const businessName = text(body.businessName, "Business name");
  const phone = normalizePhone(body.phone);
  const password = validatePassword(body.password);

  const db = getDb();
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
  if (existing) throw new HttpError(409, "An account with this phone number already exists. Log in instead.");

  const [first, ...rest] = ownerName.split(/\s+/);
  const [business] = await db
    .insert(schema.businesses)
    .values({ name: businessName, ownerFirstName: first, ownerLastName: rest.join(" "), phone })
    .returning({ id: schema.businesses.id });
  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    [{ id: userId }] = await db
      .insert(schema.users)
      .values({ businessId: business.id, name: ownerName, phone, passwordHash })
      .returning({ id: schema.users.id });
  } catch (err) {
    // lost a race with another signup for the same phone — undo the business
    await db.delete(schema.businesses).where(eq(schema.businesses.id, business.id));
    throw err;
  }
  return json({ ok: true }, { status: 201, headers: { "Set-Cookie": await startSession(request, userId) } });
});
