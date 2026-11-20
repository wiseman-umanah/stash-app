import { getCurrentBusiness } from "../business.js";
import { route } from "../http.js";
import { listSuppliers } from "../services/records.js";

/** GET /api/suppliers — suppliers plus cheaper offers spotted from purchase history */
export const GET = route(async (request) => listSuppliers(await getCurrentBusiness(request)));
