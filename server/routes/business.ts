import type { BusinessUpdate } from "../../src/data/types.js";
import { getCurrentBusiness } from "../business.js";
import { readJson, route } from "../http.js";
import { getProfile, updateProfile } from "../services/profile.js";

/** GET /api/business — business & owner details */
export const GET = route(async (request) => getProfile(await getCurrentBusiness(request)));

/** PUT /api/business { ownerName, businessName, phone } — signup / edit details */
export const PUT = route(async (request) => updateProfile(await getCurrentBusiness(request), await readJson<Partial<BusinessUpdate>>(request)));
