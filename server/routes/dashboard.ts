import { getCurrentBusiness } from "../business.js";
import { route } from "../http.js";
import { getDashboard } from "../services/dashboard.js";

/** GET /api/dashboard — home screen: today's sales, top products, low stock, insight. */
export const GET = route(async (request) => getDashboard(await getCurrentBusiness(request)));
