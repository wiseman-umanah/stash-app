import { getCurrentBusiness } from "../business.js";
import { route, searchParam } from "../http.js";
import { listExpenses } from "../services/records.js";
import { parsePeriod } from "../time.js";

/** GET /api/expenses?period=today|7d|month|all */
export const GET = route(async (request) => listExpenses(await getCurrentBusiness(request), parsePeriod(searchParam(request, "period"), "all")));
