import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import logoIcon from "@/assets/logo-icon.png";
import { cn } from "@/lib/cn";
import { DesktopSidebar } from "./DesktopSidebar";

/**
 * Responsive shell.
 * - Phones: full-bleed, the original mobile design.
 * - Signed-in app (`wide`) from 768px: sidebar + full-width content. The chat
 *   floats bottom-right up to 1279px and is docked open on the right from 1280px
 *   (see the .app-wide rules in index.css).
 * - Public pages (welcome/login/signup) from 1024px: split screen with a brand panel.
 */
export function AppShell({ wide = false }: { wide?: boolean }) {
  const { pathname } = useLocation();

  // a new page starts at the top, like a full page load did
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const card = (
    <div
      className={cn(
        "relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg desk:min-h-[calc(100dvh-56px)] desk:overflow-hidden desk:rounded-[28px] desk:shadow-device print:min-h-0 print:max-w-none print:rounded-none print:shadow-none",
        wide && "app-wide md:min-h-dvh md:max-w-none md:flex-row md:overflow-visible md:rounded-none md:shadow-none",
        !wide && "lg:mx-0 lg:min-h-0 lg:max-w-[460px] lg:self-center",
      )}
    >
      {wide && <DesktopSidebar />}
      <div className={cn("relative flex flex-1 flex-col px-[18px] pt-[18px]", wide && "app-main min-w-0 md:px-8 md:pt-7 lg:px-10 lg:pt-8")}>
        <div className={cn("flex flex-1 flex-col", wide && "md:mx-auto md:w-full md:max-w-[1040px]")}>
          <Outlet />
        </div>
      </div>
    </div>
  );

  if (wide) return card;

  return (
    <div className="app-public lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />
      <div className="lg:flex lg:items-center lg:justify-center lg:px-10 lg:py-10">{card}</div>
    </div>
  );
}

/** Left half of the login/signup screens on large displays. */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-linear-to-br from-primary to-primary-dark px-14 py-12 text-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white px-2 py-1.5">
          <img src={logoIcon} alt="" className="block w-12" />
        </div>
        <span className="font-display text-[22px] font-bold">Stash</span>
      </div>
      <div className="my-auto max-w-[460px]">
        <h2 className="font-display text-[40px] leading-[1.1] font-bold tracking-[-0.02em]">
          Just write.
          <br />
          Snap and send.
          <br />
          <span className="text-accent">Stash handles the rest.</span>
        </h2>
        <ul className="mt-8 space-y-3 text-[15px] text-white/85">
          <li>✓ Record sales, expenses and debts by chatting or speaking</li>
          <li>✓ Snap your notebook page — Stash reads it for you</li>
          <li>✓ See today's sales, low stock and who owes you at a glance</li>
        </ul>
      </div>
      <p className="text-[12.5px] text-white/60">Built for small shops in Nigeria.</p>
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-accent/15" />
    </aside>
  );
}
