// STASH — data that is still mock (not in the database yet): chat history,
// chat helpers and referral stats.
// Everything else is served by the API from Neon — see server/ and api/.
import type { Conversation, PageShortcut } from "./types";

// Referral programme (no backend yet)
export const referrals = {
  link: "stash.app/r/chidi-provisions",
  successful: "6",
  earned: "\u20A69,000",
  pending: "\u20A61,500",
};

export const chatHistory: Conversation[] = [
  {
    id: "c1",
    title: "Today's sales",
    date: "Aug 27",
    messages: [
      { from: "stash", text: "Good afternoon, Michael. I'm all caught up on today's sales — what would you like to know?" },
    ],
  },
  {
    id: "c2",
    title: "New stock",
    date: "Aug 26",
    messages: [
      { from: "user", text: "I bought 20 cartons of Indomie today" },
      { from: "stash", text: "Got it — added 20 cartons of Indomie to your stock. Your total is now 37 cartons." },
    ],
  },
  {
    id: "c3",
    title: "Expenses",
    date: "Aug 25",
    messages: [
      { from: "user", text: "Spent 5000 on electricity today" },
      { from: "stash", text: "Noted — ₦5,000 logged under Utilities for today." },
    ],
  },
  {
    id: "c4",
    title: "Inventory check",
    date: "Aug 24",
    messages: [
      { from: "user", text: "How much Coca-Cola do I have left?" },
      { from: "stash", text: "You have 9 crates of Coca-Cola (50cl) left." },
    ],
  },
];

export const suggestions: string[] = [
  "How much did I make today?",
  "What's my top product?",
  "What should I restock?",
  "How much profit this month?",
];

// @ page shortcuts for chat input
export const pageShortcuts: PageShortcut[] = [
  { tag: "products", label: "Products", path: "/products" },
  { tag: "stockrecords", label: "Stock Records", path: "/stockrecords" },
  { tag: "sales", label: "Sales", path: "/sales" },
  { tag: "expenses", label: "Expenses", path: "/expenses" },
  { tag: "debts", label: "Debts", path: "/debts" },
  { tag: "suppliers", label: "Suppliers", path: "/suppliers" },
  { tag: "invoices", label: "Invoices", path: "/invoices" },
  { tag: "reports", label: "Reports", path: "/reports" },
];
