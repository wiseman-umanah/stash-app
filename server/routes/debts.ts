import { getCurrentBusiness } from "../business.js";
import { route } from "../http.js";
import { listDebts } from "../services/records.js";

/** GET /api/debts — unsettled customer debts */
export const GET = route(async (request) => listDebts(await getCurrentBusiness(request)));
