import { NavLink, useNavigate } from "react-router";
import logoIcon from "@/assets/logo-icon.png";
import { useChat } from "@/components/chat/chat-context";
import { SignOutIcon } from "@/components/icons";
import { useLogout } from "@/hooks/queries";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/cn";

const main = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Products" },
  { to: "/stockrecords", label: "Stock Records" },
  { to: "/sales", label: "Sales" },
  { to: "/expenses", label: "Expenses" },
  { to: "/debts", label: "Debts" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" },
  { to: "/bank", label: "Bank" },
  { to: "/barcode", label: "Barcodes" },
];
const account = [
  { to: "/profile", label: "Profile" },
  { to: "/referrals", label: "Referrals" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-xl px-3 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-bg hover:text-ink",
    isActive && "bg-accent-tint font-semibold text-primary-dark hover:bg-accent-tint hover:text-primary-dark",
  );

/** Left navigation on wide screens (≥1024px). Phones use the Menu page instead. */
export function DesktopSidebar() {
  const profile = useProfile();
  const logout = useLogout();
  const chat = useChat();
  const navigate = useNavigate();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex print:hidden">
      <div className="mb-7 flex items-center gap-2.5 px-2">
        <img src={logoIcon} alt="" className="block w-11" />
        <div className="min-w-0">
          <div className="font-display text-[17px] leading-[1.15] font-bold text-ink">Stash</div>
          <div className="truncate text-[11.5px] font-medium text-muted-2">{profile.businessName}</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Main">
        {main.map((l) => (
          <NavLink key={l.to} to={l.to} className={linkClass}>
            {l.label}
          </NavLink>
        ))}
        <div className="mt-5 mb-1.5 px-3 text-[11px] font-bold tracking-[0.05em] text-muted-2 uppercase">Account</div>
        {account.map((l) => (
          <NavLink key={l.to} to={l.to} className={linkClass}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary-dark font-display text-[14px] font-semibold text-white">
            {profile.initial}
          </div>
          <div className="min-w-0 truncate text-[13px] font-semibold text-ink">{profile.fullName}</div>
        </div>
        <button
          type="button"
          onClick={() =>
            logout.mutate(undefined, {
              onSettled: () => {
                chat.reset();
                navigate("/welcome", { replace: true });
              },
            })
          }
          className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-medium text-danger hover:bg-danger-tint"
        >
          <SignOutIcon size={18} /> Sign out
        </button>
      </div>
    </aside>
  );
}
