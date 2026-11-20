import { useState } from "react";
import { AddButton, AddProductForm } from "@/components/RecordForms";
import { EmptyState, GroupedCard, ListItem, RowBody, RowTrailing } from "@/components/ui/list";
import { PageContent, PageHeader } from "@/components/ui/page";
import { QueryView, SkeletonList } from "@/components/ui/states";
import { Badge, TabRow } from "@/components/ui/tags";
import type { Product } from "@/data/types";
import { useProducts } from "@/hooks/queries";
import { formatNaira, plural } from "@/lib/format";
import { needsAttention } from "@/lib/products";

type Filter = "all" | "attention";

function ExpiryBadge({ product: p }: { product: Product }) {
  if (p.expired) return <Badge tone="expired">Expired</Badge>;
  if (p.expiryDays !== null && p.expiryDays <= 7) {
    return (
      <Badge tone="soon">
        Expires in {p.expiryDays} {plural(p.expiryDays, "day")}
      </Badge>
    );
  }
  return null;
}

export default function ProductsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const products = useProducts();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader title="Products" right={<AddButton label="Add product" onClick={() => setAdding(true)} />} />
      <AddProductForm open={adding} onClose={() => setAdding(false)} />
      <PageContent className="pt-1">
        <TabRow
          tabs={[
            { value: "all", label: "All" },
            { value: "attention", label: "Needs attention" },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <QueryView query={products} loading={<SkeletonList rows={8} />}>
          {(all) => {
            const items = filter === "attention" ? all.filter(needsAttention) : all;
            return (
              <GroupedCard>
                {items.length === 0 ? (
                  <EmptyState>{filter === "all" ? "No products yet — tap + to add your first one." : "Nothing to show here."}</EmptyState>
                ) : (
                  items.map((p) => (
                    <ListItem key={p.id}>
                      <RowBody title={p.name} subtitle={`${p.qtyLabel} · ${formatNaira(p.cost)}/${p.unit}`} />
                      <RowTrailing>
                        <ExpiryBadge product={p} />
                      </RowTrailing>
                    </ListItem>
                  ))
                )}
              </GroupedCard>
            );
          }}
        </QueryView>
      </PageContent>
    </>
  );
}
