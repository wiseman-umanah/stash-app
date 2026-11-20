import { getCurrentBusiness } from "../business.js";
import { route } from "../http.js";
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
