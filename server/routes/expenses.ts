import { readJson, route, searchParam } from "../http.js";
import { createExpense } from "../services/mutations.js";
import { getCurrentBusiness } from "../business.js";
import { listExpenses } from "../services/records.js";
import { parsePeriod } from "../time.js";

/** GET /api/expenses?period=today|7d|month|all */
export const GET = route(async (request) => listExpenses(await getCurrentBusiness(request), parsePeriod(searchParam(request, "period"), "all")));

/** POST /api/expenses { description, category, amount } */
export const POST = route(async (request) => createExpense(await getCurrentBusiness(request), await readJson<Record<string, unknown>>(request)));
