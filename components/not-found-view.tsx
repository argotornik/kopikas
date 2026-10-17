"use client";

import { CoinHeader } from "@/components/coin-header";
import { PaintedCoin } from "@/components/painted";
import { DISPLAY, FOCUS, MUTED, PANEL } from "@/components/coin-stage";
import { INK, OAT, PAGE, PILL } from "@/components/coin-look";
import { coinFonts } from "@/components/coin-fonts";
import { cn } from "@/lib/utils";

// A page that isn't there: one coin, tilted as if it rolled off, a plain sentence on what
// may have happened, and the way back to the board.
export function NotFoundView() {
  return (
    <div className={cn(coinFonts, PAGE)}>
      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <CoinHeader links={[]} />
        <main className={cn(PANEL, OAT, "mx-auto flex max-w-[640px] flex-col items-center px-6 py-12 text-center sm:py-16")}>
          <span className="inline-block -rotate-12">
            <PaintedCoin size={80} mood="wow" seed={6} />
          </span>
          <h1 className={cn(DISPLAY, "mt-5 text-balance text-[26px] font-semibold leading-tight sm:text-[32px]")}>This page isn&apos;t on the board</h1>
          <p className={cn("mt-2 max-w-[44ch] text-balance text-[15px]", MUTED)}>
            The address may be mistyped, or the page moved when the board was rebuilt.
          </p>
          <a href="/" className={cn(PILL, INK, "mt-6 inline-flex items-center", FOCUS)}>
            Back to the board
          </a>
        </main>
      </div>
    </div>
  );
}
