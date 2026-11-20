import type { Me } from "../../../src/data/types.js";
import { getSessionUser } from "../../auth.js";
import { route } from "../../http.js";

/** GET /api/auth/me — the signed-in user, or null when logged out (not an error). */
export const GET = route(async (request): Promise<Me | null> => {
  const user = await getSessionUser(request);
  return user ? { name: user.name, phone: user.phone } : null;
});
