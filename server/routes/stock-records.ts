import { getCurrentBusiness } from "../business.js";
import { route, searchParam } from "../http.js";
import { getStockRecords } from "../services/records.js";
import { parsePeriod } from "../time.js";

/** GET /api/stock-records?period=today|7d|month|all */
export const GET = route(async (request) => getStockRecords(await getCurrentBusiness(request), parsePeriod(searchParam(request, "period"), "7d")));
