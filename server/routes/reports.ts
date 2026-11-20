import { getCurrentBusiness } from "../business.js";
import { route } from "../http.js";
import { getReports } from "../services/reports.js";

/** GET /api/reports — last-30-day totals, 7-day trend, best sellers, expense breakdown */
export const GET = route(async (request) => getReports(await getCurrentBusiness(request)));
