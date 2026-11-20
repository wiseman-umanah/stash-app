// Every way of creating or changing a record. Used by both the REST endpoints
// (forms in the app) and the AI tools (chat), so both behave identically.
// Inputs are validated here; multi-step writes use db.batch (one transaction).
import { and, eq, ilike, sql } from "drizzle-orm";
import { formatNaira } from "../../src/lib/format.js";
import { fuzzyProductScore } from "../../src/lib/products.js";
import type { CurrentBusiness } from "../business.js";
import { getDb, schema } from "../db/client.js";
import { HttpError } from "../http.js";
import { toKobo } from "../money.js";

const { products, sales, expenses, purchases, debts } = schema;

export const EXPENSE_CATEGORIES = ["Logistics", "Utilities", "Supplies", "Salaries", "Rent", "Other"] as const;

/** Input problems — shown to the owner (forms) or the model (chat). */
export class InputError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

export const num = (v: unknown, field: string, { int = false, max = 100_000_000, allowZero = false } = {}) => {
  const n = typeof v === "string" ? Number(v.replace(/[₦,\s]/g, "")) : Number(v);
  const tooSmall = allowZero ? n < 0 : n <= 0;
  if (v === "" || v === null || v === undefined || !Number.isFinite(n) || tooSmall || n > max || (int && !Number.isInteger(n))) {
    throw new InputError(`${field} must be a ${allowZero ? "" : "positive "}${int ? "whole " : ""}number.`);
  }
  return n;
};
export const str = (v: unknown, field: string, max = 120) => {
  if (typeof v !== "string" || !v.trim()) throw new InputError(`${field} is required.`);
  if (v.trim().length > max) throw new InputError(`${field} is too long.`);
  return v.trim();
};
const optionalDate = (v: unknown, field: string): string | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new InputError(`${field} must be a date (YYYY-MM-DD).`);
  return v;
};

const units = (n: number, p: { unit: string; unitPlural: string }) => `${n} ${n === 1 ? p.unit : p.unitPlural}`;

function pluralize(unit: string): string {
  const u = unit.toLowerCase();
  if (u.endsWith("s")) return unit;
  if (u === "loaf") return "loaves";
  if (/[^aeiou]y$/.test(u)) return `${unit.slice(0, -1)}ies`;
  if (/(x|ch|sh)$/.test(u)) return `${unit}es`;
  return `${unit}s`;
}

const productCols = {
  id: products.id,
  name: products.name,
  unit: products.unit,
  unitPlural: products.unitPlural,
  costKobo: products.costKobo,
  stockUnits: products.stockUnits,
};

/** Resolve what the owner called a product to exactly one product, or explain why not. */
export async function findProduct(biz: CurrentBusiness, name: string) {
  const db = getDb();
  const exact = await db
    .select(productCols)
    .from(products)
    .where(and(eq(products.businessId, biz.id), sql`lower(${products.name}) = lower(${name})`))
    .limit(1);
  if (exact[0]) return exact[0];
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const candidates = words.length
    ? await db
        .select(productCols)
        .from(products)
        .where(and(eq(products.businessId, biz.id), ...words.map((w) => ilike(products.name, `%${w}%`))))
        .limit(5)
    : [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    throw new InputError(`"${name}" matches several products: ${candidates.map((c) => c.name).join(", ")}. Which one?`);
  }
  // misspelt or misheard (e.g. a voice note heard "Nidomi"): suggest, never auto-pick for a write
  const all = await db.select({ name: products.name }).from(products).where(eq(products.businessId, biz.id));
  const close = all
    .map((p) => ({ name: p.name, score: fuzzyProductScore(name, p.name) }))
    .filter((p) => p.score > 300)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (close.length) throw new InputError(`No product is called "${name}". Did you mean ${close[0].name}?`);
  throw new InputError(`There's no product called "${name}" yet. Add it as a new product first.`);
}

export interface WriteResult {
  /** one-line summary, e.g. "Sale: 3 cartons of Indomie for ₦40,500" */
  summary: string;
  /** extra info for the chat model, e.g. new stock level */
  detail?: string;
  changed: ("sales" | "expenses" | "products" | "debts")[];
}

export async function createProduct(biz: CurrentBusiness, input: Record<string, unknown>): Promise<WriteResult> {
  const name = str(input.name, "Product name", 80);
  const unit = str(input.unit ?? "unit", "Unit", 30).toLowerCase();
  const cost = num(input.cost_price ?? input.cost, "Cost price");
  const stock = input.stock === undefined || input.stock === "" ? 0 : num(input.stock, "Stock", { int: true, max: 1_000_000, allowZero: true });
  const target = input.target_stock === undefined || input.target_stock === "" ? 0 : num(input.target_stock, "Full-shelf level", { int: true, max: 1_000_000, allowZero: true });
  const expiryDate = optionalDate(input.expiry_date, "Expiry date");
  const db = getDb();
  const [dupe] = await db
    .select({ name: products.name })
    .from(products)
    .where(and(eq(products.businessId, biz.id), sql`lower(${products.name}) = lower(${name})`))
    .limit(1);
  if (dupe) throw new InputError(`You already have a product called "${dupe.name}".`);
  const p = { unit, unitPlural: pluralize(unit) };
  await db.insert(products).values({
    businessId: biz.id,
    name,
    unit,
    unitPlural: p.unitPlural,
    costKobo: toKobo(cost),
    stockUnits: stock,
    // default "full shelf" to twice the opening stock so the low-stock bar has a reference
    targetStock: target || stock * 2,
    expiryDate,
  });
  return {
    summary: `New product: ${name} at ${formatNaira(cost)}/${unit}, ${units(stock, p)} in stock`,
    changed: ["products"],
  };
}

export async function createSale(biz: CurrentBusiness, input: Record<string, unknown>): Promise<WriteResult> {
  const qty = num(input.quantity, "Quantity", { int: true, max: 100_000 });
  const total = num(input.total_amount ?? input.amount, "Amount");
  const p = await findProduct(biz, str(input.product, "Product"));
  const db = getDb();
  await db.batch([
    db.insert(sales).values({ businessId: biz.id, productId: p.id, productName: p.name, qty, amountKobo: toKobo(total), costKobo: p.costKobo * qty }),
    db.update(products).set({ stockUnits: sql`greatest(${products.stockUnits} - ${qty}, 0)` }).where(eq(products.id, p.id)),
  ]);
  const newStock = Math.max(0, p.stockUnits - qty);
  return {
    summary: `Sale: ${units(qty, p)} of ${p.name} for ${formatNaira(total)}`,
    detail:
      `Stock now ${units(newStock, p)}.` +
      (p.stockUnits < qty ? ` Only ${units(p.stockUnits, p)} were in stock, so stock is now 0 — the owner may need to restock or correct the count.` : ""),
    changed: ["sales", "products"],
  };
}

export async function createExpense(biz: CurrentBusiness, input: Record<string, unknown>): Promise<WriteResult> {
  const amount = num(input.amount, "Amount");
  const description = str(input.description, "Description");
  const raw = typeof input.category === "string" ? input.category : "Other";
  const category = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase()) ?? "Other";
  await getDb().insert(expenses).values({ businessId: biz.id, description, category, amountKobo: toKobo(amount) });
  return { summary: `Expense: ${description} (${category}) ${formatNaira(amount)}`, changed: ["expenses"] };
}

export async function createRestock(biz: CurrentBusiness, input: Record<string, unknown>): Promise<WriteResult> {
  const qty = num(input.quantity, "Quantity", { int: true, max: 100_000 });
  const p = await findProduct(biz, str(input.product, "Product"));
  const unitCost = input.unit_cost === undefined || input.unit_cost === null || input.unit_cost === "" ? null : num(input.unit_cost, "Cost per unit");
  const unitCostKobo = unitCost === null ? p.costKobo : toKobo(unitCost);
  const db = getDb();
  await db.batch([
    db.insert(purchases).values({ businessId: biz.id, productId: p.id, qty, unitCostKobo }),
    // latest purchase price becomes the cost price used for profit
    db.update(products).set({ stockUnits: sql`${products.stockUnits} + ${qty}`, costKobo: unitCostKobo }).where(eq(products.id, p.id)),
  ]);
  return {
    summary: `Restock: ${units(qty, p)} of ${p.name} at ${formatNaira(unitCostKobo / 100)} each`,
    detail: `Stock now ${units(p.stockUnits + qty, p)}.`,
    changed: ["products"],
  };
}

export async function createDebt(biz: CurrentBusiness, input: Record<string, unknown>): Promise<WriteResult> {
  const customer = str(input.customer, "Customer name", 80);
  const amount = num(input.amount, "Amount");
  const note = typeof input.note === "string" && input.note.trim() ? ` (${input.note.trim().slice(0, 80)})` : "";
  await getDb()
    .insert(debts)
    .values({ businessId: biz.id, customerName: customer, amountKobo: toKobo(amount), balanceKobo: toKobo(amount), incurredOn: sql`(now() at time zone ${biz.timezone})::date` });
  return { summary: `Debt: ${customer} owes ${formatNaira(amount)}${note}`, changed: ["debts"] };
}

/** Apply a customer payment to their unpaid debts, oldest first. */
export async function recordDebtPayment(biz: CurrentBusiness, input: Record<string, unknown>): Promise<WriteResult> {
  const amount = num(input.amount, "Amount");
  const db = getDb();
  let open: { id: string; customerName: string; balanceKobo: number }[];
  if (typeof input.debt_id === "string" && input.debt_id) {
    open = await db
      .select({ id: debts.id, customerName: debts.customerName, balanceKobo: debts.balanceKobo })
      .from(debts)
      .where(and(eq(debts.businessId, biz.id), eq(debts.id, input.debt_id), sql`${debts.balanceKobo} > 0`));
  } else {
    const customer = str(input.customer, "Customer name", 80);
    open = await db
      .select({ id: debts.id, customerName: debts.customerName, balanceKobo: debts.balanceKobo })
      .from(debts)
      .where(and(eq(debts.businessId, biz.id), sql`lower(${debts.customerName}) = lower(${customer})`, sql`${debts.balanceKobo} > 0`))
      .orderBy(debts.incurredOn);
  }
  if (open.length === 0) throw new InputError("No unpaid debt found for that customer.");
  const owed = open.reduce((s, d) => s + d.balanceKobo, 0);
  let remaining = toKobo(amount);
  if (remaining > owed) throw new InputError(`${open[0].customerName} only owes ${formatNaira(owed / 100)}.`);
  const updates = [];
  for (const d of open) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, d.balanceKobo);
    remaining -= pay;
    updates.push(db.update(debts).set({ balanceKobo: d.balanceKobo - pay }).where(eq(debts.id, d.id)));
  }
  await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  const left = owed - toKobo(amount);
  return {
    summary: `Payment: ${open[0].customerName} paid ${formatNaira(amount)}`,
    detail: left > 0 ? `${open[0].customerName} still owes ${formatNaira(left / 100)}.` : `${open[0].customerName} has fully paid.`,
    changed: ["debts"],
  };
}
