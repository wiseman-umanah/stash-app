import { useState } from "react";
import { AddButton, AddDebtForm, DebtPaymentForm } from "@/components/RecordForms";
import type { Debt } from "@/data/types";
import { Amount, EmptyState, GroupedCard, ListItem, RowBody, RowTrailing } from "@/components/ui/list";
import { PageContent, PageHeader, PageIntro } from "@/components/ui/page";
import { QueryView, SkeletonList } from "@/components/ui/states";
import { StatusTag } from "@/components/ui/tags";
import { useDebts } from "@/hooks/queries";
import { formatCalendarDate } from "@/lib/dates";
import { formatNaira } from "@/lib/format";

export default function DebtsPage() {
  const debts = useDebts();
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<Debt | null>(null);

  return (
    <>
      <PageHeader title="Debts" right={<AddButton label="Add debt" onClick={() => setAdding(true)} />} />
      <AddDebtForm open={adding} onClose={() => setAdding(false)} />
      <DebtPaymentForm debt={paying} onClose={() => setPaying(null)} />
      <PageContent className="pt-1">
        <PageIntro>Money customers owe your business. Tell Stash to add or update a debt any time.</PageIntro>
        <QueryView query={debts} loading={<SkeletonList rows={3} />}>
          {(items) => (
            <GroupedCard>
              {items.length === 0 ? (
                <EmptyState>Nobody owes you money right now.</EmptyState>
              ) : (
                items.map((d) => {
                  const date = formatCalendarDate(d.incurredOn);
                  return (
                    <ListItem key={d.id}>
                      <RowBody title={d.customer} subtitle={d.status === "Partly paid" ? `Balance ${formatNaira(d.balance)} · ${date}` : date} />
                      <RowTrailing>
                        <Amount>{formatNaira(d.amount)}</Amount>
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <StatusTag tone={d.status === "Outstanding" ? "danger" : "warn"}>{d.status}</StatusTag>
                          <button
                            type="button"
                            onClick={() => setPaying(d)}
                            className="cursor-pointer rounded-[14px] bg-primary px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Paid
                          </button>
                        </div>
                      </RowTrailing>
                    </ListItem>
                  );
                })
              )}
            </GroupedCard>
          )}
        </QueryView>
      </PageContent>
    </>
  );
}
