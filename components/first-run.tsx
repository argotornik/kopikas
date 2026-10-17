"use client";

import { LockIcon } from "lucide-react";
import { SAVINGS } from "@/lib/engine";
import { ConnectForm } from "@/components/connect-form";
import { CoinHeader } from "@/components/coin-header";
import { PaintedDefs, PaintedMini, PaintedRoll } from "@/components/painted";
import { breakable, wrapperOf } from "@/components/coin-stage";
import { DISPLAY, FOCUS, INK_TEXT, MUTED, OAT, PAGE, PANEL } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// An empty board is a fresh deployment, not a quiet month: the tray itself, waiting,
// every category asleep on its floor, and the one thing to do where the month's total
// will be. Connecting opens the same tray with its rolls growing. With a token already
// stored the same page offers to run the sync again or take a fresh token.
export function FirstRun({
  hasToken,
  encrypted,
  categories,
  fontClass,
}: {
  hasToken: boolean;
  encrypted: boolean;
  categories: string[];
  fontClass: string;
}) {
  const all = categories.map((name) => ({ name }));
  // The floor, as the board stands it: every category but Savings, which is money kept.
  const floor = categories.filter((c) => c !== SAVINGS);
  return (
    <div className={cn(fontClass, PAGE)}>
      <PaintedDefs />
      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <CoinHeader links={[]} />
        {/* The theme's variables re-tinted, so the token field shared with Settings wears the new look. */}
        <main className={cn(PANEL, OAT, "coins-panel p-5 sm:p-8")}>
          <div className="max-w-[640px]">
            <p className={cn("text-[15px]", MUTED)}>Before your first month</p>
            <h1 className={cn(DISPLAY, "mt-1 text-[30px] font-semibold leading-tight sm:text-[40px]")}>Connect your LHV account</h1>
            <p className={cn("mt-2 text-[15px]", MUTED)}>
              Every category is waiting on the floor. Connect LHV and your charges arrive as coins; from then on a sync
              runs every hour by itself.
            </p>
            <ol className="mt-4 flex flex-col gap-2.5 text-[15px]">
              <li className="flex items-start gap-3">
                <StepNumber n={1} />
                <span>
                  Open{" "}
                  <a href="https://api.lhv.ai/api-access" className={cn("underline underline-offset-2", INK_TEXT, FOCUS)} target="_blank" rel="noreferrer">
                    api.lhv.ai/api-access
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>{" "}
                  and sign in with Smart-ID, Mobile-ID or ID-card. Grant the two read-only scopes, accounts and transactions.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <StepNumber n={2} />
                <span>
                  Copy the refresh token it shows and paste it below. It is the long one that renews itself, not the access
                  token that lasts 15 minutes.
                </span>
              </li>
            </ol>
            <div className="mt-5">
              <ConnectForm hasToken={hasToken} />
            </div>
            {/* What handing it over means, said before the button is pressed rather than after. */}
            <p className={cn("mt-3 flex items-start gap-2 text-[13px]", MUTED)}>
              <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                Read-only: Kopikas sees balances and transactions and cannot make payments. The token renews itself with
                every sync and lapses only after 30 days without one
                {encrypted ? "; it is kept encrypted and never shown again." : "."}
              </span>
            </p>
          </div>

          {/* The floor, asleep: the rolls the first charges will wake. */}
          {/* Rows that balance: all in one from 1024px (up to twelve), in two halves below that. */}
          <div
            role="group"
            aria-label="Your categories, waiting for their first charges"
            className="mt-10 grid grid-cols-[repeat(var(--half),minmax(0,1fr))] justify-items-center gap-y-6 max-sm:hidden lg:grid-cols-[repeat(var(--all),minmax(0,1fr))]"
            style={{ "--all": Math.min(floor.length, 12), "--half": Math.min(Math.ceil(floor.length / 2), 6) } as React.CSSProperties}
          >
            {floor.map((name, i) => (
              <div key={name} className="flex w-full max-w-[84px] flex-col items-center">
                <PaintedRoll
                  index={categories.indexOf(name)}
                  colour={wrapperOf(all, name, true)}
                  body={0}
                  extra={0}
                  budget={null}
                  over={false}
                  gulping={false}
                  height={56}
                  width={48}
                  pad={12}
                  delay={0.1 + i * 0.03}
                />
                <div className="mt-3 flex min-h-[2lh] flex-col justify-end text-center text-[13px] font-medium leading-tight hyphens-auto wrap-anywhere">
                  <span className="line-clamp-2">{breakable(name)}</span>
                </div>
                <div className={cn("text-[13px] tabular-nums", MUTED)}>0,00 €</div>
              </div>
            ))}
          </div>
          {/* On a phone they sleep in one list, as the phone's tray shows them. */}
          <div role="group" aria-label="Your categories, waiting for their first charges" className="mt-6 border-t border-ink/10 pt-5 sm:hidden dark:border-white/10">
            <div className={cn("text-[14px] font-medium", MUTED)}>Nothing yet</div>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {floor.map((name) => (
                <li key={name} className="flex min-h-9 items-center gap-2 text-[13px] font-medium">
                  <PaintedMini index={categories.indexOf(name)} colour={wrapperOf(all, name, true)} />
                  <span className="min-w-0 truncate">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

// A numbered step, in an Ink disc.
export function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-medium text-white dark:bg-chalk dark:text-ink"
    >
      {n}
    </span>
  );
}
