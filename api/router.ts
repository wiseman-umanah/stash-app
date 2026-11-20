// The ONE Vercel Function for the whole API.
//
// Vercel's Hobby plan allows at most 12 functions per deployment and every
// file in api/ counts as one, so all endpoints live in server/routes/ and this
// router dispatches to them. vercel.json rewrites /api/<path> to
// /api/router?__path=<path>; locally `pnpm dev` calls it with the original URL.
import * as authLogin from "../server/routes/auth/login.js";
import * as authLogout from "../server/routes/auth/logout.js";
import * as authMe from "../server/routes/auth/me.js";
import * as authSignup from "../server/routes/auth/signup.js";
import * as bank from "../server/routes/bank.js";
import * as business from "../server/routes/business.js";
import * as chat from "../server/routes/chat.js";
import * as dashboard from "../server/routes/dashboard.js";
import * as debts from "../server/routes/debts.js";
import * as expenses from "../server/routes/expenses.js";
import * as health from "../server/routes/health.js";
import * as invoices from "../server/routes/invoices.js";
import * as ocr from "../server/routes/ocr.js";
import * as products from "../server/routes/products.js";
import * as reports from "../server/routes/reports.js";
import * as sales from "../server/routes/sales.js";
import * as stockRecords from "../server/routes/stock-records.js";
import * as suppliers from "../server/routes/suppliers.js";
import * as transcribe from "../server/routes/transcribe.js";
import { json } from "../server/http.js";

type Handler = (request: Request) => Promise<Response>;
type RouteModule = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", Handler>>;

const routes: Record<string, RouteModule> = {
  "auth/login": authLogin,
  "auth/logout": authLogout,
  "auth/me": authMe,
  "auth/signup": authSignup,
  bank,
  business,
  chat,
  dashboard,
  debts,
  expenses,
  health,
  invoices,
  ocr,
  products,
  reports,
  sales,
  "stock-records": stockRecords,
  suppliers,
  transcribe,
};

/** "/api/sales" or "/api/router?__path=sales" -> "sales" */
export function routeName(url: URL): string {
  const path = url.searchParams.get("__path") ?? url.pathname.replace(/^\/api\/?/, "");
  return path.replace(/^\/+|\/+$/g, "");
}

async function dispatch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const name = routeName(url);
  const mod = Object.hasOwn(routes, name) ? routes[name] : undefined;
  if (!mod) return json({ error: `No API route for /api/${name}` }, { status: 404 });
  const handler = mod[request.method as keyof RouteModule];
  if (!handler) return json({ error: `${request.method} not allowed on /api/${name}` }, { status: 405 });
  // handlers read query params from the URL, so drop the internal one
  url.searchParams.delete("__path");
  return handler(new Request(url, request));
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
