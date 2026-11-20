// Shapes shared by the API (server/, api/) and the React app.
// All money values are in naira (the database stores kobo).
// Timestamps are ISO strings; calendar dates are "YYYY-MM-DD".

export type Period = "today" | "7d" | "month" | "all" | "custom";

export interface Business {
  name: string;
  ownerFirstName: string;
  ownerLastName: string;
  phone: string;
  email: string | null;
}

export interface BusinessUpdate {
  ownerName: string;
  businessName: string;
  phone: string;
}

export interface WeekBar {
  label: string;
  pct: number;
  today?: boolean;
}

export interface TodaySummary {
  totalSales: number;
  salesCount: number;
  /** % change vs yesterday; null when there were no sales yesterday */
  changePct: number | null;
  weekBars: WeekBar[];
}

export interface TopProduct {
  rank: string;
  name: string;
  units: number;
  unitLabel: string;
  revenue: number;
  share: number;
}

export type StockLevel = "danger" | "warn";

export interface LowStockItem {
  name: string;
  remaining: string;
  pct: number;
  level: StockLevel;
}

export interface Insight {
  productName: string;
  units: number;
  unitPlural: string;
  revenue: number;
}

export interface Dashboard {
  today: TodaySummary;
  topProducts: TopProduct[];
  lowStock: LowStockItem[];
  /** products expired or expiring within 7 days */
  attentionCount: number;
  insight: Insight | null;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  unitPlural: string;
  stockUnits: number;
  /** e.g. "17 cartons" */
  qtyLabel: string;
  cost: number;
  /** days until expiry; null = doesn't expire / not tracked */
  expiryDays: number | null;
  expired: boolean;
  /** average selling price per unit from recorded sales; null if never sold */
  avgSellingPrice: number | null;
  salesCount: number;
}

export interface StockRecord {
  product: string;
  purchased: number;
  sold: number;
  remaining: number;
}

export interface Sale {
  id: string;
  soldAt: string;
  product: string;
  qty: number;
  amount: number;
  /** null when the cost price wasn't known at the time of sale */
  profit: number | null;
}

export interface Expense {
  id: string;
  spentAt: string;
  description: string;
  category: string;
  amount: number;
}

export type DebtStatus = "Outstanding" | "Partly paid";

export interface Debt {
  id: string;
  customer: string;
  amount: number;
  balance: number;
  incurredOn: string;
  status: DebtStatus;
}

export interface Supplier {
  id: string;
  name: string;
  products: string[];
  outstanding: number;
}

export interface SupplierOffer {
  product: string;
  usualCost: number;
  offerCost: number;
  supplier: string;
}

export interface SuppliersResponse {
  suppliers: Supplier[];
  offers: SupplierOffer[];
}

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  issuedOn: string;
  status: InvoiceStatus;
}

export interface BankAccount {
  bankName: string;
  accountTail: string;
}

export type BankTxnStatus = "matched" | "review" | "unmatched";

export interface BankTransaction {
  id: string;
  occurredAt: string;
  amount: number;
  description: string;
  status: BankTxnStatus;
  matchedTo: string | null;
}

export interface BankResponse {
  account: BankAccount | null;
  transactions: BankTransaction[];
}

export interface Reports {
  revenue30d: number;
  profit30d: number;
  marginPct: number | null;
  expenses30d: number;
  weekBars: WeekBar[];
  topProducts: TopProduct[];
  expenseBreakdown: { category: string; amount: number }[];
}

// ---- chat-only (still mock data) ----

export interface HistoryMessage {
  from: "user" | "stash";
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: HistoryMessage[];
}

export interface PageShortcut {
  tag: string;
  label: string;
  path: string;
}

// ---- AI chat (POST /api/chat) ----

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatTurn[];
}

export interface ChatResponse {
  reply: string;
  /** what the AI saved to the database this turn, e.g. "Sale: 3 cartons of Indomie for ₦40,500" */
  recorded: string[];
  /** which kinds of records changed, so the app can refresh */
  changed: ("sales" | "expenses" | "products" | "debts")[];
}

// ---- Auth ----

export interface SignupRequest {
  ownerName: string;
  businessName: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface Me {
  name: string;
  phone: string;
}

export interface TranscribeResponse {
  text: string;
}

export interface OcrResponse {
  /** lines read from the notebook photo; empty if it wasn't a page of records */
  text: string;
}

export interface WriteResult {
  summary: string;
  detail?: string;
  changed: ("sales" | "expenses" | "products" | "debts")[];
}
