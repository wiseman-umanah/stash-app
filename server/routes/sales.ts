import { readJson, route, searchParam } from "../http.js";
import { createSale } from "../services/mutations.js";
import { getCurrentBusiness } from "../business.js";
import { listSales } from "../services/records.js";
import { parsePeriod } from "../time.js";

/** GET /api/sales?period=today|7d|month|all */
export const GET = route(async (request) => listSales(await getCurrentBusiness(request), parsePeriod(searchParam(request, "period"), "today")));

/** POST /api/sales { product, quantity, total_amount } */
export const POST = route(async (request) => createSale(await getCurrentBusiness(request), await readJson<Record<string, unknown>>(request)));
