import logoIcon from "@/assets/logo-icon.png";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatNaira, plural } from "@/lib/format";
import { stockLine } from "@/lib/products";
import type { Product } from "@/data/types";
import type { ChatMessage, MessageBody } from "./types";

export function StashAvatar({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <div className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-accent-tint", className)}>
      <img src={logoIcon} alt="Stash" className={cn("h-3 w-3 object-contain", imgClassName)} />
    </div>
  );
}

export function ChatMessageView({ message, onChooseProduct }: { message: ChatMessage; onChooseProduct: (p: Product) => void }) {
  const isUser = message.from === "user";
  const bubble = (
    <div
      className={cn(
        "max-w-[78%] rounded-[18px] px-[15px] py-3 text-[14px] leading-[1.45]",
        isUser ? "rounded-br-[6px] bg-primary text-white" : "rounded-bl-[6px] border border-border bg-surface text-ink",
      )}
    >
      {message.image && <img src={message.image} alt="Attached" className="block max-w-[200px] rounded-[14px] border border-border" />}
      <div className={message.image ? "mt-2" : undefined}>
        <MessageContent body={message.body} onChooseProduct={onChooseProduct} />
      </div>
      {message.recorded?.map((r) => (
        <div key={r} className="mt-2 flex items-start gap-1.5 border-t border-border pt-2 text-[12px] font-semibold text-primary">
          <span aria-hidden="true">✓</span>
          <span>Saved · {r}</span>
        </div>
      ))}
    </div>
  );

  if (isUser) return <div className="mb-3.5 flex justify-end">{bubble}</div>;

  return (
    <div className="mb-3.5 flex">
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <StashAvatar />
          <span className="text-[11.5px] font-bold tracking-[0.04em] text-muted-2 uppercase">Stash</span>
        </div>
        {bubble}
      </div>
    </div>
  );
}

function MessageContent({ body, onChooseProduct }: { body: MessageBody; onChooseProduct: (p: Product) => void }) {
  switch (body.kind) {
    case "text":
      return <span className="whitespace-pre-line">{body.text}</span>;
    case "typing":
      return (
        <span className="flex h-[21px] items-center gap-1" role="status" aria-label="Stash is typing">
          {[0, 0.15, 0.3].map((delay) => (
            <span key={delay} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2" style={{ animationDelay: `${delay}s` }} />
          ))}
        </span>
      );
    case "product":
      return <ProductCard product={body.product} />;
    case "chooser":
      return (
        <>
          <div className="mb-1.5 font-semibold">Products matching "{body.query}"</div>
          {body.products.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onChooseProduct(p)}
              className="flex w-full cursor-pointer items-center justify-between border-b border-border px-0.5 py-[9px] text-left text-[13.5px] font-semibold text-ink last:border-b-0"
            >
              <span>{p.name}</span>
              <ChevronRightIcon size={15} className="shrink-0 text-muted-2" />
            </button>
          ))}
        </>
      );
  }
}

/** Product facts from real recorded data only — "Not set" rather than an invented price. */
function ProductCard({ product }: { product: Product }) {
  const avg = product.avgSellingPrice;
  return (
    <>
      <b>{product.name}</b>
      <br />
      Cost price: {formatNaira(product.cost)}/{product.unit}
      <br />
      Selling price: Not set
      <br />
      {avg !== null ? (
        <>
          Average selling price: {formatNaira(Math.round(avg))}{" "}
          <span className="font-medium text-muted-2">
            (based on {product.salesCount} recorded {plural(product.salesCount, "sale")})
          </span>
        </>
      ) : (
        "Average selling price: Not available yet"
      )}
      <br />
      In stock: {stockLine(product)}
    </>
  );
}
