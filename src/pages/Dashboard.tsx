import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import logoIcon from "@/assets/logo-icon.png";
import { useChat } from "@/components/chat/chat-context";
import { BellIcon, HamburgerIcon, WarningIcon } from "@/components/icons";
import { StockRow } from "@/components/StockRow";
import { InsightCard, MiniChart, TintCard } from "@/components/ui/cards";
import { Amount, AmountNote, EmptyState, GroupedCard, ListItem, RowBody, RowIcon, RowTrailing } from "@/components/ui/list";
import { PageContent, SectionLabel, SectionLink, squareButton } from "@/components/ui/page";
import { QueryView, SkeletonBlock, SkeletonList } from "@/components/ui/states";
import { useDashboard } from "@/hooks/queries";
import { useProfile } from "@/hooks/useProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatNaira, getGreeting, plural } from "@/lib/format";

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const profile = useProfile();
  const dashboard = useDashboard();
  useChatDeepLinks();

  return (
    <>
      <header className="flex shrink-0 items-center justify-between px-0.5 pt-0.5 pb-5 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="block aspect-[397/149] w-11 shrink-0">
            <img src={logoIcon} alt="Stash" className="block h-full w-full" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="font-display text-[17px] leading-[1.15] font-bold tracking-[-0.01em] text-ink">Stash</div>
            <div className="mt-px min-h-[12px] text-[11.5px] leading-[1.1] font-medium text-muted-2">{profile.businessName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`${squareButton} relative`} aria-label="Notifications">
            <BellIcon />
            <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full border-[1.5px] border-surface bg-accent" />
          </div>
          <Link to="/menu" className={`${squareButton} cursor-pointer`} aria-label="Menu">
            <HamburgerIcon />
          </Link>
        </div>
      </header>

      <div className="shrink-0 px-0.5 pt-0.5 pb-[18px]">
        <h1 className="text-[21px] font-bold tracking-[-0.01em] text-ink">
          {getGreeting()}
          {profile.firstName && `, ${profile.firstName}`} 👋
        </h1>
        <p className="mt-1 text-[13.5px] font-[450] text-muted">Here's how your business is doing today.</p>
      </div>

      <PageContent>
        <QueryView
          query={dashboard}
          loading={
            <>
              <SkeletonBlock className="h-[184px]" />
              <SectionLabel title="Top products" />
              <SkeletonList rows={3} />
              <SectionLabel title="Almost out of stock" />
              <SkeletonList rows={3} />
            </>
          }
        >
          {(d) => (
            <>
              {/* Today's Sales */}
              <TintCard>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold tracking-[0.06em] text-primary uppercase opacity-85">Today's Sales</span>
                  <div className="flex items-center gap-[5px] rounded-[20px] border border-primary/14 bg-white/65 py-1 pr-[9px] pl-[7px] text-[11px] font-semibold text-primary-dark">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_2.5px_rgba(34,197,94,0.25)]" />
                    Up to date
                  </div>
                </div>
                <div className="mt-3 font-display text-[38px] leading-none font-bold tracking-[-0.02em] text-ink">{formatNaira(d.today.totalSales)}</div>
                <div className="mt-[9px] flex items-center gap-2">
                  <span className="text-[13px] font-medium text-muted">
                    {d.today.salesCount} {plural(d.today.salesCount, "sale")} recorded today
                  </span>
                  {d.today.changePct !== null && (
                    <div
                      className="flex items-center gap-0.5 rounded-[20px] bg-white/70 px-2 py-[3px] text-[11.5px] font-bold text-primary-dark"
                      title="Compared with this time yesterday"
                    >
                      {d.today.changePct >= 0 ? "↑" : "↓"} {Math.abs(d.today.changePct)}%
                    </div>
                  )}
                </div>
                <MiniChart bars={d.today.weekBars} />
              </TintCard>

              <div className="lg:grid lg:grid-cols-2 lg:gap-6 xl:grid-cols-1 2xl:grid-cols-2">
              <div>
              {/* Top products (+ expiry alert row only when something needs attention) */}
              <SectionLabel className="first:mt-[26px]" title="Top products" action={<SectionLink to="/products">See all</SectionLink>} />
              <GroupedCard>
                {d.topProducts.length === 0 && <EmptyState>No sales recorded yet today.</EmptyState>}
                {d.topProducts.map((p) => (
                  <ListItem key={p.rank}>
                    <RowIcon>{p.rank}</RowIcon>
                    <RowBody title={p.name} subtitle={`${p.units} ${p.unitLabel}`} />
                    <RowTrailing>
                      <Amount>{formatNaira(p.revenue)}</Amount>
                      <AmountNote>{p.share}%</AmountNote>
                    </RowTrailing>
                  </ListItem>
                ))}
                {d.attentionCount > 0 && (
                  <ListItem to="/products">
                    <RowIcon tone="warn">
                      <WarningIcon />
                    </RowIcon>
                    <RowBody
                      title={`${d.attentionCount} ${plural(d.attentionCount, "product")} expiring soon`}
                      subtitle={<span className="font-semibold text-primary">Review products that need attention →</span>}
                    />
                  </ListItem>
                )}
              </GroupedCard>

              </div>
              <div>
              {/* Almost out of stock */}
              <SectionLabel className="first:mt-[26px]" title="Almost out of stock" action={<SectionLink to="/stock">See all</SectionLink>} />
              <GroupedCard>
                {d.lowStock.length === 0 && <EmptyState>Everything is well stocked.</EmptyState>}
                {d.lowStock.slice(0, 3).map((s) => (
                  <StockRow key={s.name} item={s} />
                ))}
              </GroupedCard>
              </div>
              </div>

              {d.insight && (
                <InsightCard
                  className="mt-[26px]"
                  title={`${d.insight.productName} was your best-selling product today.`}
                  subtitle={`You sold ${d.insight.units} ${d.insight.unitPlural}, bringing in ${formatNaira(d.insight.revenue)} in sales.`}
                />
              )}
            </>
          )}
        </QueryView>
      </PageContent>
    </>
  );
}

/**
 * Deep links from other pages:
 *   /dashboard?openChat=1          → expands the chat
 *   /dashboard?scanned=STB-1234    → posts a scanned barcode into the chat
 */
function useChatDeepLinks() {
  const [params, setParams] = useSearchParams();
  const chat = useChat();

  useEffect(() => {
    const openChat = params.get("openChat") === "1";
    const scanned = params.get("scanned");
    if (!openChat && !scanned) return;

    const timers: number[] = [];
    if (openChat) timers.push(window.setTimeout(() => chat.expand(), 200));
    if (scanned) {
      timers.push(
        window.setTimeout(() => {
          chat.pushText("user", `Scanned barcode ${scanned}`);
          timers.push(
            window.setTimeout(
              () => chat.pushText("stash", `Got it — ${scanned} is ready to be assigned. What is this item, and what did it cost you?`),
              500,
            ),
          );
        }, 450),
      );
    }
    // drop the params so a refresh doesn't replay them
    setParams({}, { replace: true });
    return () => timers.forEach((t) => window.clearTimeout(t));
    // run once on arrival only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
