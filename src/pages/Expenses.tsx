import { useState } from "react";
import { AddButton, AddExpenseForm } from "@/components/RecordForms";
import { Amount, EmptyState, GroupedCard, ListItem, RowBody, RowTrailing } from "@/components/ui/list";
import { PageContent, PageHeader, PageIntro } from "@/components/ui/page";
import { QueryView, SkeletonList } from "@/components/ui/states";
import { TabRow } from "@/components/ui/tags";
import { useExpenses } from "@/hooks/queries";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/dates";
import { formatNaira } from "@/lib/format";

type Period = "all" | "today" | "7d";

export default function ExpensesPage() {
  const [period, setPeriod] = useState<Period>("all");
  const expenses = useExpenses(period);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader title="Expenses" right={<AddButton label="Add expense" onClick={() => setAdding(true)} />} />
      <AddExpenseForm open={adding} onClose={() => setAdding(false)} />
      <PageContent className="pt-1">
        <PageIntro>Recorded through your conversations with Stash. This page is for reviewing them.</PageIntro>
        <TabRow
          tabs={[
            { value: "all", label: "All" },
            { value: "today", label: "Today" },
            { value: "7d", label: "Last 7 days" },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <QueryView query={expenses} loading={<SkeletonList rows={4} />}>
          {(items) => (
            <GroupedCard className={cn("transition-opacity", expenses.isPlaceholderData && "opacity-60")}>
              {items.length === 0 ? (
                <EmptyState>No expenses in this period.</EmptyState>
              ) : (
                items.map((e) => (
                  <ListItem key={e.id}>
                    <RowBody title={e.description} subtitle={`${formatDay(e.spentAt)} · ${e.category}`} />
                    <RowTrailing>
                      <Amount>{formatNaira(e.amount)}</Amount>
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
