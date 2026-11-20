import { endSession } from "../../auth.js";
import { json, route } from "../../http.js";

/** POST /api/auth/logout */
export const POST = route(async (request) => json({ ok: true }, { headers: { "Set-Cookie": await endSession(request) } }));
