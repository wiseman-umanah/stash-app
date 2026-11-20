import { readJson, route } from "../http.js";
import { createDebt, recordDebtPayment } from "../services/mutations.js";
import { getCurrentBusiness } from "../business.js";
import { listDebts } from "../services/records.js";

/** GET /api/debts — unsettled customer debts */
export const GET = route(async (request) => listDebts(await getCurrentBusiness(request)));

/**
 * POST /api/debts { customer, amount, note? }          — new debt
 * POST /api/debts { action: "payment", debt_id, amount } — customer paid some back
 */
export const POST = route(async (request) => {
  const biz = await getCurrentBusiness(request);
  const body = await readJson<Record<string, unknown>>(request);
  return body.action === "payment" ? recordDebtPayment(biz, body) : createDebt(biz, body);
});
