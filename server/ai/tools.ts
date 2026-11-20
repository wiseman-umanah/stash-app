// Tools the AI can call to record things the owner tells it about.
// They're thin wrappers over server/services/mutations.ts — the same code the
// app's forms use — and return a short plain-text result for the model.
import type { CurrentBusiness } from "../business.js";
import {
  EXPENSE_CATEGORIES,
  InputError,
  createDebt,
  createExpense,
  createProduct,
  createRestock,
  createSale,
  recordDebtPayment,
  type WriteResult,
} from "../services/mutations.js";
import type { ToolDefinition } from "./groq.js";

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]): ToolDefinition => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

export const tools: ToolDefinition[] = [
  fn(
    "record_sale",
    "Record a sale. Reduces stock. Only call when product, quantity and total amount are known.",
    {
      product: { type: "string", description: "Product name as the owner said it, e.g. 'indomie'" },
      quantity: { type: "integer", minimum: 1, description: "Units sold (e.g. cartons)" },
      total_amount: { type: "number", minimum: 1, description: "Total money received, in naira" },
    },
    ["product", "quantity", "total_amount"],
  ),
  fn(
    "record_expense",
    "Record money spent running the business (transport, electricity, wages, rent, bags...). Not for buying stock.",
    {
      description: { type: "string", description: "e.g. 'Transport to market'" },
      category: { type: "string", enum: [...EXPENSE_CATEGORIES] },
      amount: { type: "number", minimum: 1, description: "Naira" },
    },
    ["description", "category", "amount"],
  ),
  fn(
    "record_restock",
    "Record stock bought for resale. Increases stock of an EXISTING product.",
    {
      product: { type: "string" },
      quantity: { type: "integer", minimum: 1 },
      unit_cost: { type: "number", minimum: 1, description: "Cost per unit in naira, if said" },
    },
    ["product", "quantity"],
  ),
  fn(
    "create_product",
    "Add a NEW product the shop sells. Needs name, unit and cost price. Only when the owner wants to add it.",
    {
      name: { type: "string", description: "e.g. 'Golden Penny Spaghetti (500g)'" },
      unit: { type: "string", description: "Selling unit, singular: carton, pack, tin, bottle, unit..." },
      cost_price: { type: "number", minimum: 1, description: "What the owner pays per unit, naira" },
      stock: { type: "integer", minimum: 0, description: "Units in stock now, if said" },
    },
    ["name", "unit", "cost_price"],
  ),
  fn(
    "record_debt",
    "Record that a customer took goods on credit / owes money.",
    {
      customer: { type: "string" },
      amount: { type: "number", minimum: 1, description: "Naira owed" },
      note: { type: "string", description: "What it was for, optional" },
    },
    ["customer", "amount"],
  ),
  fn(
    "record_debt_payment",
    "Record a customer paying back money they owe.",
    {
      customer: { type: "string" },
      amount: { type: "number", minimum: 1, description: "Naira paid" },
    },
    ["customer", "amount"],
  ),
];

export type ChangedResource = WriteResult["changed"][number];

export interface ToolResult {
  /** what the model sees */
  content: string;
  /** shown to the owner and kept in chat history so it isn't recorded twice */
  recorded?: string;
  changed?: ChangedResource[];
}

const handlers: Record<string, (biz: CurrentBusiness, args: Record<string, unknown>) => Promise<WriteResult>> = {
  record_sale: createSale,
  record_expense: createExpense,
  record_restock: createRestock,
  create_product: createProduct,
  record_debt: createDebt,
  record_debt_payment: recordDebtPayment,
};

export async function runTool(biz: CurrentBusiness, name: string, rawArgs: string): Promise<ToolResult> {
  const handler = handlers[name];
  if (!handler) return { content: `Error: unknown tool ${name}.` };
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, unknown>;
  } catch {
    return { content: "Error: tool arguments were not valid JSON." };
  }
  try {
    const r = await handler(biz, args);
    return { content: `Recorded. ${r.summary}.${r.detail ? ` ${r.detail}` : ""}`, recorded: r.summary, changed: r.changed };
  } catch (err) {
    if (err instanceof InputError) return { content: `Not recorded: ${err.message} Ask the owner.` };
    console.error(`tool ${name} failed`, err);
    return { content: "Not recorded: a database error occurred. Tell the owner it wasn't saved and to try again." };
  }
}
