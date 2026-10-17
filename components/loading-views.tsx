"use client";
// Client, though nothing here is interactive: the shared look (PANEL, DISPLAY) lives in
// coin-stage.tsx, a client module, and a server component importing it gets references
// instead of the class strings.

import type { ReactNode } from "react";
import { CoinHeader } from "@/components/coin-header";
import { PANEL } from "@/components/coin-stage";
import { OAT, PAGE } from "@/components/coin-look";
import { coinFonts } from "@/components/coin-fonts";
import { cn } from "@/lib/utils";

// While a page opens: its own shape in quiet tones, so nothing jumps when it fills in.
// No faces and no heights: a placeholder must never look like money. Shapes on Oat Paper
// are Ink at 7%, shapes on the page are Mist.
const ON_OAT = "bg-[#16171C]/[0.07] dark:bg-white/[0.07]";
const ON_PAGE = "bg-[#F4F5F7] dark:bg-[#191B22]";
const Bar = ({ className, page = false }: { className: string; page?: boolean }) => (
  <div className={cn("rounded-full", page ? ON_PAGE : ON_OAT, className)} />
);

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn(coinFonts, PAGE)}>
      <div role="status" className="mx-auto max-w-[1200px] animate-loading-late px-5 pb-20 sm:px-6">
        <span className="sr-only">{label}</span>
        <CoinHeader links={[]} />
        <div aria-hidden>{children}</div>
      </div>
    </div>
  );
}

const Pile = ({ className }: { className?: string }) => (
  <div className={cn("flex -space-x-2.5", className)}>
    {[0, 1, 2].map((i) => (
      <div key={i} className={cn("size-10 rounded-full", ON_OAT)} />
    ))}
  </div>
);

// The board: the tray's head and floor, then the charges and the cards beside them.
export function BoardLoading() {
  return (
    <Frame label="Opening the board…">
      <div className={cn(PANEL, OAT, "p-6 sm:p-8")}>
        <div className="flex items-start gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Bar className="h-7 w-[150px] rounded-xl sm:h-[34px] sm:w-[200px]" />
            <Bar className="h-11 w-[210px] rounded-2xl sm:h-[52px] sm:w-[280px]" />
            <Bar className="h-3 w-[240px] max-w-full sm:w-[460px]" />
          </div>
          <Pile className="max-sm:hidden" />
        </div>
        {/* A phone's rolls lie down as bars in one list. */}
        <Pile className="mt-5 sm:hidden" />
        <div className="mt-5 flex flex-col gap-4 sm:hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Bar className="h-2.5 w-[90px]" />
                <Bar className="h-2.5 w-[56px]" />
              </div>
              <Bar className="h-3.5 w-full" />
            </div>
          ))}
        </div>
        {/* The floor: a stub per roll, its name and amount under it; eight fit until 1024px. */}
        <div className="mt-8 hidden items-end justify-between sm:flex">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={cn("flex flex-col items-center gap-2.5", i >= 8 && "max-lg:hidden")}>
              <Bar className="h-[22px] w-14" />
              <Bar className="h-2.5 w-[52px]" />
              <Bar className="h-2.5 w-9" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-2.5">
          <Bar page className="mb-1 h-5 w-[160px] rounded-lg" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} page className={cn("h-[52px] w-full rounded-2xl", i >= 3 && "max-sm:hidden")} />
          ))}
        </div>
        <div className="hidden flex-col gap-4 lg:flex">
          <div className={cn(PANEL, OAT, "h-[150px]")} />
          <div className={cn(PANEL, OAT, "h-[210px]")} />
        </div>
      </div>
    </Frame>
  );
}

// Pooleks: where the tab stands, the two piles, then the statement's lines.
export function PooleksLoading() {
  return (
    <Frame label="Opening Pooleks…">
      <div className="flex flex-col gap-8">
        <div className={cn(PANEL, OAT, "flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center")}>
          <div className="flex min-w-0 flex-col gap-3 lg:flex-1">
            <Bar className="h-3.5 w-[180px]" />
            <Bar className="h-6 w-[220px] rounded-xl" />
            <Bar className="h-11 w-[200px] rounded-2xl sm:h-[52px]" />
            <div className="mt-2 flex gap-3">
              <Bar className="h-11 w-[120px]" />
              <Bar className="h-11 w-[132px] max-sm:hidden" />
            </div>
          </div>
          <div className="flex gap-10 max-lg:hidden">
            <Pile />
            <Pile />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Bar page className="mb-1 h-5 w-[140px] rounded-lg" />
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} page className="h-[60px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </Frame>
  );
}

// Settings: the title and its jump pills, the connection's line, the rule cards.
export function SettingsLoading() {
  return (
    <Frame label="Opening Settings…">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Bar page className="h-[34px] w-[160px] rounded-xl sm:h-10" />
          <div className="flex gap-2">
            <Bar page className="h-9 w-[104px]" />
            <Bar page className="h-9 w-[110px]" />
            <Bar page className="h-9 w-[124px]" />
          </div>
        </div>
        <div className={cn(PANEL, OAT, "flex flex-col gap-4 p-5 sm:p-8 lg:flex-row lg:items-center")}>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <Bar className="h-4 w-[200px]" />
            <Bar className="h-3 w-[260px] max-w-full" />
          </div>
          <div className="flex gap-3">
            <Bar className="h-11 w-[150px]" />
            <Bar className="h-11 w-[110px]" />
          </div>
        </div>
        <div className={cn(PANEL, OAT, "p-5 sm:p-8")}>
          <Bar className="h-5 w-[130px] rounded-lg" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["h-[120px]", "h-[90px] max-sm:hidden", "h-[140px] max-lg:hidden"].map((h) => (
              <div key={h} className={cn("rounded-2xl bg-white dark:bg-[#23252E]", h)} />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
