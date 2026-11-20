import { getCurrentBusiness } from "../business.js";
import { HttpError, readJson, route } from "../http.js";
import { getBank, reconcileTransaction } from "../services/bank.js";

/** GET /api/bank — connected account + recent transactions */
export const GET = route(async (request) => getBank(await getCurrentBusiness(request)));

/** POST /api/bank { transactionId } — owner confirms a reconciliation */
export const POST = route(async (request) => {
  const { transactionId } = await readJson<{ transactionId?: unknown }>(request);
  if (typeof transactionId !== "string" || !/^[0-9a-f-]{36}$/i.test(transactionId)) {
    throw new HttpError(400, "transactionId is required.");
  }
  const biz = await getCurrentBusiness(request);
  await reconcileTransaction(biz, transactionId);
  return getBank(biz);
});
