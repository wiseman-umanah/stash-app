import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { cn } from "@/lib/cn";
import { DesktopSidebar } from "./DesktopSidebar";

/**
 * Phones: full-bleed (the main target). Tablets/small desktops: a centred card.
 * `wide` (signed-in app) on screens ≥1024px: sidebar + wide content, with the
 * chat docked on the right (see the .chat-sheet desktop rules in index.css).
 */
export function AppShell({ wide = false }: { wide?: boolean }) {
  const { pathname } = useLocation();

  // a new page starts at the top, like a full page load did
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg desk:min-h-[calc(100dvh-56px)] desk:overflow-hidden desk:rounded-[28px] desk:shadow-device print:min-h-0 print:max-w-none print:rounded-none print:shadow-none",
        wide && "app-wide lg:min-h-dvh lg:max-w-none lg:flex-row lg:overflow-visible lg:rounded-none lg:shadow-none",
      )}
    >
      {wide && <DesktopSidebar />}
      <div className={cn("relative flex flex-1 flex-col px-[18px] pt-[18px]", wide && "app-main min-w-0 lg:px-10 lg:pt-8")}>
        <div className={cn("flex flex-1 flex-col", wide && "lg:mx-auto lg:w-full lg:max-w-[880px]")}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
