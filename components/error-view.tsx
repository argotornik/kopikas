"use client";

import { usePathname } from "next/navigation";
import { CoinHeader } from "@/components/coin-header";
import { PaintedCoin } from "@/components/painted";
import { DISPLAY, FOCUS, INK, MUTED, OAT, PAGE, PANEL, PILL, WHITE } from "@/components/coin-look";
import { coinFonts } from "@/components/coin-fonts";
import { cn } from "@/lib/utils";

// A page that failed to open, the 404's sibling: the coin tipped onto its side, still
// smiling; that nothing filed is lost; Try again, which asks the server for the page
// once more; and the server's reference, to find the error in the log. Without the
// header when the root layout itself failed: its account button needs Clerk's provider.
export function ErrorView({ digest, retry, header = true }: { digest?: string; retry: () => void; header?: boolean }) {
  const onBoard = usePathname() === "/";
  return (
    <div className={cn(coinFonts, PAGE)}>
      <title>This page couldn&apos;t open · Kopikas</title>
      <div className={cn("mx-auto max-w-[1200px] px-5 pb-20 sm:px-6", !header && "pt-24")}>
        {header && <CoinHeader links={[]} />}
        <main className={cn(PANEL, OAT, "mx-auto flex max-w-[640px] flex-col items-center px-6 py-12 text-center sm:py-16")}>
          <span aria-hidden className="flex flex-col items-center">
            <span className="inline-block -rotate-90">
              <PaintedCoin size={80} seed={6} />
            </span>
            {/* The floor oval: the one shadow the board allows, so the coin lies on something. */}
            <span className="mt-1 h-2 w-[72px] rounded-[50%] bg-black/12 dark:bg-black/35" />
          </span>
          <h1 className={cn(DISPLAY, "mt-5 text-balance text-[26px] font-semibold leading-tight sm:text-[32px]")}>
            This page couldn&apos;t open
          </h1>
          <p className={cn("mt-2 max-w-[44ch] text-balance text-[15px]", MUTED)}>
            Nothing you filed is lost, and trying again usually works.
          </p>
          <div className="mt-6 flex w-full max-w-[240px] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row">
            <button type="button" onClick={retry} className={cn(PILL, INK, FOCUS)}>
              Try again
            </button>
            {!onBoard && (
              <a href="/" className={cn(PILL, WHITE, "inline-flex items-center justify-center", FOCUS)}>
                Back to the board
              </a>
            )}
          </div>
          {digest && (
            <p className={cn("mt-5 text-[13px]", MUTED)}>
              Reference <span className="select-all tabular-nums">{digest}</span> · for the server log
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
