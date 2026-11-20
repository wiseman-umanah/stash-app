import { getCurrentBusiness } from "../business.js";
import { route } from "../http.js";
import { listInvoices } from "../services/records.js";

/** GET /api/invoices */
export const GET = route(async (request) => listInvoices(await getCurrentBusiness(request)));
