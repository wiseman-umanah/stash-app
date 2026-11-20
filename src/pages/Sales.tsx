import { useState } from "react";
import { AddButton, RecordSaleForm } from "@/components/RecordForms";
import { Amount, AmountNote, EmptyState, GroupedCard, ListItem, RowBody, RowTrailing } from "@/components/ui/list";
import { PageContent, PageHeader } from "@/components/ui/page";
import { QueryView, SkeletonList } from "@/components/ui/states";
import { TabRow } from "@/components/ui/tags";
import type { Period } from "@/data/types";
import { useSales } from "@/hooks/queries";
import { formatDateTime } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/cn";

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

export default function SalesPage() {
  const [period, setPeriod] = useState<Period>("today");
  const sales = useSales(period);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader title="Sales" right={<AddButton label="Record a sale" onClick={() => setAdding(true)} />} />
      <RecordSaleForm open={adding} onClose={() => setAdding(false)} />
      <PageContent className="pt-1">
        <TabRow tabs={periods} value={period} onChange={setPeriod} />
        <QueryView query={sales} loading={<SkeletonList rows={6} />}>
          {(items) => (
            <GroupedCard className={cn("transition-opacity", sales.isPlaceholderData && "opacity-60")}>
              {items.length === 0 ? (
                <EmptyState>No sales in this period.</EmptyState>
              ) : (
                items.map((s) => (
                  <ListItem key={s.id}>
                    <RowBody title={s.product} subtitle={`${formatDateTime(s.soldAt)} · Qty ${s.qty}`} />
                    <RowTrailing>
                      <Amount>{formatNaira(s.amount)}</Amount>
                      {s.profit !== null && <AmountNote>+{formatNaira(s.profit)} profit</AmountNote>}
                    </RowTrailing>
                  </ListItem>
                ))
              )}
            </GroupedCard>
          )}
        </QueryView>
      </PageContent>
    </>
  );
}
