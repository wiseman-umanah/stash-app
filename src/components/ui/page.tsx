import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";
import { BackIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";

export const squareButton =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-border bg-surface text-ink";

/** Standard page header: back button, centred title, optional right-hand slot. */
export function PageHeader({
  title,
  back = "/dashboard",
  right,
  docTitle,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
  /** browser tab title, defaults to `title` */
  docTitle?: string;
}) {
  usePageTitle(docTitle ?? title);
  return (
    <div className="flex shrink-0 items-center justify-between px-0.5 pt-0.5 pb-5 print:hidden">
      <Link to={back} className={`${squareButton} page-back`} aria-label="Back">
        <BackIcon />
      </Link>
      <h1 className="font-display text-[16px] font-bold text-ink">{title}</h1>
      {right ?? <div className="w-9" />}
    </div>
  );
}

/**
 * Page body. `chatPad` leaves room at the bottom for the fixed chat dock so
 * content never sits underneath it.
 */
export function PageContent({ chatPad = true, className, ...rest }: ComponentProps<"div"> & { chatPad?: boolean }) {
  return <div className={cn("flex-1", chatPad ? "pb-[200px] lg:pb-12" : "pb-6", className)} {...rest} />;
}

/** Small grey explainer line at the top of a page. */
export function PageIntro({ className, ...rest }: ComponentProps<"p">) {
  return <p className={cn("mb-3.5 text-[12.5px] leading-normal font-medium text-muted-2", className)} {...rest} />;
}

export function SectionLabel({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-[26px] flex items-center justify-between px-0.5 pt-0.5 pb-2.5 first:mt-0", className)}>
      <h2 className="text-[14px] font-bold tracking-[-0.005em] text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function SectionLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return <Link className={cn("text-[12px] font-semibold text-primary", className)} {...rest} />;
}

export function GroupLabel({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-5 px-0.5 pt-0.5 pb-2 text-[11px] font-bold tracking-[0.05em] text-muted-2 uppercase first:mt-0", className)}
      {...rest}
    />
  );
}
