import { readJson, route } from "../http.js";
import { createProduct } from "../services/mutations.js";
import { getCurrentBusiness } from "../business.js";
import { listProducts, lowStockFrom, publicProduct } from "../services/products.js";

/**
 * GET /api/products            — all products
 * GET /api/products?view=low   — "almost out of stock" list
 */
export const GET = route(async (request) => {
  const products = await listProducts(await getCurrentBusiness(request));
  if (new URL(request.url).searchParams.get("view") === "low") return lowStockFrom(products);
  return products.map(publicProduct);
});

/** POST /api/products { name, unit, cost_price, stock?, target_stock?, expiry_date? } */
export const POST = route(async (request) => createProduct(await getCurrentBusiness(request), await readJson<Record<string, unknown>>(request)));
