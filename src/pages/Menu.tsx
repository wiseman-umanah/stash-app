import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useChat } from "@/components/chat/chat-context";
import { SignOutIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Chevron, GroupedCard, ListItem, RowBody, RowIcon } from "@/components/ui/list";
import { ModalCard, ModalOverlay } from "@/components/ui/modal";
import { GroupLabel, PageContent, PageHeader } from "@/components/ui/page";
import { useLogout } from "@/hooks/queries";
import { useInstallApp } from "@/hooks/useInstallApp";
import { useProfile } from "@/hooks/useProfile";

const businessLinks = [
  { to: "/products", label: "Products" },
  { to: "/stockrecords", label: "Stock Records" },
  { to: "/sales", label: "Sales" },
  { to: "/expenses", label: "Expenses" },
  { to: "/debts", label: "Debts" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" },
  { to: "/bank", label: "Bank" },
];

const moreLinks = [
  { to: "/referrals", label: "Referrals" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms of Service" },
];

function MenuLink({ to, title, subtitle }: { to: string; title: string; subtitle?: string }) {
  return (
    <ListItem to={to}>
      <RowBody title={title} subtitle={subtitle} />
      <Chevron />
    </ListItem>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const chat = useChat();
  const profile = useProfile();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const app = useInstallApp();

  const logout = useLogout();
  const confirmSignOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        chat.reset();
        navigate("/welcome", { replace: true });
      },
    });

  return (
    <>
      <PageHeader
        title="Menu"
        right={
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary-dark font-display text-[14px] font-semibold text-white"
          >
            {profile.initial}
          </Link>
        }
      />

      <PageContent chatPad={false} className="pt-1">
        <GroupLabel>Business</GroupLabel>
        <GroupedCard>
          {businessLinks.map((l) => (
            <MenuLink key={l.to} to={l.to} title={l.label} />
          ))}
        </GroupedCard>

        <GroupLabel>Account</GroupLabel>
        <GroupedCard>
          <MenuLink to="/profile" title="Profile Details" subtitle={`${profile.businessName} · ${profile.fullName}`} />
        </GroupedCard>

        {app.canInstall && (
          <Button className="mt-5" onClick={() => void app.install()}>
            Install Stash app
          </Button>
        )}

        <GroupLabel>More</GroupLabel>
        <GroupedCard>
          {moreLinks.map((l) => (
            <MenuLink key={l.to} to={l.to} title={l.label} />
          ))}
        </GroupedCard>

        <div className="mt-6">
          <GroupedCard>
            <ListItem role="button" tabIndex={0} onClick={() => setSignOutOpen(true)} onKeyDown={(e) => e.key === "Enter" && setSignOutOpen(true)}>
              <RowIcon tone="danger">
                <SignOutIcon />
              </RowIcon>
              <RowBody title={<span className="text-danger">Sign Out</span>} />
            </ListItem>
          </GroupedCard>
        </div>
      </PageContent>

      <ModalOverlay open={signOutOpen} label="Sign out">
        <ModalCard open={signOutOpen} className="rounded-[22px] p-[22px]">
          <h3 className="mb-2 text-[16px] font-bold text-ink">Sign out of Stash?</h3>
          <p className="mb-[18px] text-[13.5px] leading-normal text-muted">You'll need to sign back in to see your business data.</p>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="h-[46px] text-[14px]" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmSignOut}>
              Sign Out
            </Button>
          </div>
        </ModalCard>
      </ModalOverlay>
    </>
  );
}
