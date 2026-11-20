// "Add" forms for creating records from the app (the AI chat can do the same).
// Each opens in a modal, posts to the API and refreshes every screen on success.
import { useState, type FormEvent, type ReactNode } from "react";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { ModalCard, ModalOverlay } from "@/components/ui/modal";
import { squareButton } from "@/components/ui/page";
import { useCreateRecord, useProducts } from "@/hooks/queries";
import { cn } from "@/lib/cn";

const EXPENSE_CATEGORIES = ["Logistics", "Utilities", "Supplies", "Salaries", "Rent", "Other"];
const selectClass =
  "h-[50px] w-full rounded-2xl border border-border bg-surface px-4 text-[14.5px] text-ink outline-none focus:border-primary";

/** "+" button for the page header. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn(squareButton, "cursor-pointer bg-primary text-white border-primary")}>
      <PlusIcon size={17} />
    </button>
  );
}

function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  pending,
  error,
  submitLabel,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: Error | null;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <ModalOverlay open={open} onClose={onClose} label={title}>
      <ModalCard open={open} className="max-h-[90dvh] max-w-[420px] overflow-y-auto rounded-[22px] p-[22px]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-ink">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[10px] border border-border bg-bg text-ink">
            <CloseIcon />
          </button>
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <FormError error={error} />
          <Button type="submit" className="mt-1 disabled:opacity-70" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </form>
      </ModalCard>
    </ModalOverlay>
  );
}

/** Small hook: form state that resets after a successful save. */
function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState(initial);
  const bind = (key: keyof T) => ({
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });
  return { values, bind, reset: () => setValues(initial) };
}

type ModalProps = { open: boolean; onClose: () => void };

export function AddProductForm({ open, onClose }: ModalProps) {
  const create = useCreateRecord("products");
  const f = useForm({ name: "", unit: "pack", cost_price: "", stock: "", expiry_date: "" });
  const save = () =>
    create.mutate(f.values, {
      onSuccess: () => {
        f.reset();
        onClose();
      },
    });
  return (
    <FormModal open={open} title="Add a product" onClose={onClose} onSubmit={save} pending={create.isPending} error={create.error} submitLabel="Add product">
      <Field label="Product name" id="p-name" placeholder="e.g. Golden Penny Spaghetti (500g)" required {...f.bind("name")} />
      <Field label="Sold per (unit)" id="p-unit" placeholder="pack, carton, tin, bottle…" required {...f.bind("unit")} />
      <Field label="Cost price per unit (₦)" id="p-cost" inputMode="decimal" placeholder="e.g. 1100" required {...f.bind("cost_price")} />
      <Field label="How many in stock now" id="p-stock" inputMode="numeric" placeholder="e.g. 20" {...f.bind("stock")} />
      <Field label="Expiry date (optional)" id="p-expiry" type="date" {...f.bind("expiry_date")} />
    </FormModal>
  );
}

export function RecordSaleForm({ open, onClose }: ModalProps) {
  const create = useCreateRecord("sales");
  const { data: products = [] } = useProducts();
  const f = useForm({ product: "", quantity: "1", total_amount: "" });
  const save = () =>
    create.mutate(f.values, {
      onSuccess: () => {
        f.reset();
        onClose();
      },
    });
  return (
    <FormModal open={open} title="Record a sale" onClose={onClose} onSubmit={save} pending={create.isPending} error={create.error} submitLabel="Save sale">
      <div className="mb-3.5">
        <label htmlFor="s-product" className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          Product
        </label>
        <select id="s-product" required className={selectClass} {...f.bind("product")}>
          <option value="" disabled>
            Choose a product
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name} ({p.qtyLabel} left)
            </option>
          ))}
        </select>
      </div>
      <Field label="Quantity sold" id="s-qty" inputMode="numeric" required {...f.bind("quantity")} />
      <Field label="Total amount received (₦)" id="s-amount" inputMode="decimal" placeholder="e.g. 13500" required {...f.bind("total_amount")} />
    </FormModal>
  );
}

export function AddExpenseForm({ open, onClose }: ModalProps) {
  const create = useCreateRecord("expenses");
  const f = useForm({ description: "", category: "Logistics", amount: "" });
  const save = () =>
    create.mutate(f.values, {
      onSuccess: () => {
        f.reset();
        onClose();
      },
    });
  return (
    <FormModal open={open} title="Add an expense" onClose={onClose} onSubmit={save} pending={create.isPending} error={create.error} submitLabel="Save expense">
      <Field label="What was it for?" id="e-desc" placeholder="e.g. Transport to market" required {...f.bind("description")} />
      <div className="mb-3.5">
        <label htmlFor="e-cat" className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          Category
        </label>
        <select id="e-cat" className={selectClass} {...f.bind("category")}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Field label="Amount (₦)" id="e-amount" inputMode="decimal" required {...f.bind("amount")} />
    </FormModal>
  );
}

export function AddDebtForm({ open, onClose }: ModalProps) {
  const create = useCreateRecord("debts");
  const f = useForm({ customer: "", amount: "", note: "" });
  const save = () =>
    create.mutate(f.values, {
      onSuccess: () => {
        f.reset();
        onClose();
      },
    });
  return (
    <FormModal open={open} title="Add a debt" onClose={onClose} onSubmit={save} pending={create.isPending} error={create.error} submitLabel="Save debt">
      <Field label="Customer name" id="d-customer" placeholder="e.g. Tunde" required {...f.bind("customer")} />
      <Field label="Amount owed (₦)" id="d-amount" inputMode="decimal" required {...f.bind("amount")} />
      <Field label="What was it for? (optional)" id="d-note" placeholder="e.g. 2 packs of spaghetti" {...f.bind("note")} />
    </FormModal>
  );
}

export function DebtPaymentForm({ debt, onClose }: { debt: { id: string; customer: string; balance: number } | null; onClose: () => void }) {
  const create = useCreateRecord("debts");
  const f = useForm({ amount: "" });
  const save = () =>
    debt &&
    create.mutate(
      { action: "payment", debt_id: debt.id, amount: f.values.amount },
      {
        onSuccess: () => {
          f.reset();
          onClose();
        },
      },
    );
  return (
    <FormModal
      open={debt !== null}
      title={debt ? `${debt.customer} paid back` : "Payment"}
      onClose={onClose}
      onSubmit={save}
      pending={create.isPending}
      error={create.error}
      submitLabel="Save payment"
    >
      <Field label="Amount paid (₦)" id="dp-amount" inputMode="decimal" required {...f.bind("amount")} />
    </FormModal>
  );
}
