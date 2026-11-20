import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Centred dialog overlay. Always mounted so the fade/scale transition plays
 * both ways; `open` toggles visibility. On wide screens it's constrained to
 * the centred app card.
 */
export function ModalOverlay({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className={cn(
        "fixed inset-0 z-60 flex items-center justify-center bg-[rgba(10,25,19,0.45)] p-8 transition-opacity duration-200 ease-in-out print:hidden",
        "desk:right-auto desk:left-1/2 desk:w-full desk:max-w-[480px] desk:-translate-x-1/2",
        // wide desktop app: dim the whole window
        "lg:right-0 lg:left-0 lg:w-auto lg:max-w-none lg:translate-x-0",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {children}
    </div>
  );
}

/** Card inside a ModalOverlay, with the subtle lift-in animation. */
export function ModalCard({ open, className, children }: { open: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "w-full bg-surface shadow-modal transition-transform duration-200 ease-in-out",
        open ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]",
        className,
      )}
    >
      {children}
    </div>
  );
}
