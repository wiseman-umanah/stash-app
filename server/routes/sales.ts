import { getCurrentBusiness } from "../business.js";
import { route, searchParam } from "../http.js";
import { listSales } from "../services/records.js";
import { parsePeriod } from "../time.js";

/** GET /api/sales?period=today|7d|month|all */
export const GET = route(async (request) => listSales(await getCurrentBusiness(request), parsePeriod(searchParam(request, "period"), "today")));
