"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import type { Board } from "@/lib/board";
import { DISPLAY, FOCUS, MUTED, PANEL, eur, shortDate } from "@/components/coin-stage";
import { MerchantIcon } from "@/components/merchant-icon";
import { cn } from "@/lib/utils";

// The new board's subscriptions: only what needs the owner (a new price to accept,
// one gone quiet, one due within a week) and what they cost a month. The full list
// opens in place.

type Sub = Board["subscriptions"][number];
const WEEK = 7 * 86_400_000;
const day = (iso: string) => shortDate.format(new Date(iso + "T00:00:00Z"));
const price = (s: Sub) => s.lastCharge?.amount ?? s.sub.expectedAmount;

export function CoinSubscriptions({
  subscriptions,
  monthly,
  month,
  onAcceptPrice,
  onStop,
}: {
  subscriptions: Sub[];
  // What they cost a month, yearly ones spread out a twelfth each.
  monthly: number;
  // This month, for "paid" against "due".
  month: string;
  onAcceptPrice: (s: Sub) => void;
  onStop: (s: Sub) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = subscriptions.filter((s) => s.sub.active);
  const today = new Date().toLocaleDateString("sv-SE");
  const dueSoon = (s: Sub) => !!s.nextDue && s.nextDue >= today && new Date(s.nextDue).getTime() - new Date(today).getTime() <= WEEK;
  const needs = active
    .filter((s) => s.priceChanged || s.overdue || dueSoon(s))
    .sort((a, b) => rank(a) - rank(b) || (a.nextDue ?? "").localeCompare(b.nextDue ?? ""));
  function rank(s: Sub) {
    return s.priceChanged ? 0 : s.overdue ? 1 : 2;
  }
  const status = (s: Sub) =>
    s.lastCharge && s.lastCharge.date.slice(0, 7) === month
      ? `paid ${day(s.lastCharge.date)}`
      : s.nextDue
        ? `${s.nextDue < today ? "was due" : "due"} ${day(s.nextDue)}`
        : "no charge seen yet";

  const row = (s: Sub, full: boolean) => (
    <li key={s.sub.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 dark:bg-[#23252E]">
      <MerchantIcon name={s.label} domain={s.domain} emoji={s.emoji} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{s.label}</div>
        <div className={cn("text-[13px]", MUTED)}>
          {s.priceChanged && s.lastCharge
            ? `${s.lastCharge.amount > s.sub.expectedAmount ? "Up" : "Down"} from ${eur.format(s.sub.expectedAmount)}`
            : s.overdue
              ? `Gone quiet: nothing since it was due ${s.nextDue ? day(s.nextDue) : ""}`
              : status(s)}
        </div>
        {!full && (s.priceChanged || s.overdue) && (
          <button
            type="button"
            onClick={() => (s.priceChanged ? onAcceptPrice(s) : onStop(s))}
            className={cn(
              "mt-2 h-9 rounded-full bg-[#F4F5F7] px-3.5 text-[13px] font-medium hover:bg-[#E9EBEF] dark:bg-[#191B22] dark:hover:bg-[#2C2F3A]",
              FOCUS
            )}
          >
            {s.priceChanged && s.lastCharge ? `Accept ${eur.format(s.lastCharge.amount)}` : "Stop tracking"}
          </button>
        )}
      </div>
      <span className="shrink-0 text-[15px] font-medium tabular-nums">{eur.format(price(s))}</span>
      {full && (
        <button
          type="button"
          onClick={() => onStop(s)}
          aria-label={`Stop tracking ${s.label}`}
          className={cn("-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-[#F4F5F7] dark:hover:bg-[#2C2F3A]", MUTED, FOCUS)}
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      )}
    </li>
  );

  return (
    <section aria-labelledby="subs-heading" className={cn(PANEL, "bg-[#EFEBE3] p-5 sm:p-6 dark:bg-[#1F1D22]")}>
      <h2 id="subs-heading" className={cn(DISPLAY, "flex items-baseline justify-between gap-3 text-[20px] font-semibold")}>
        Subscriptions
        {active.length > 0 && <span className={cn("font-sans text-[13px] font-normal tabular-nums", MUTED)}>{eur.format(monthly)} a month</span>}
      </h2>
      {active.length === 0 ? (
        <p className={cn("pt-3 text-[15px]", MUTED)}>
          Nothing tracked yet. Drop a coin on the Subscriptions roll and Kopikas keeps an eye on its price and when it is due.
        </p>
      ) : (
        <>
          {needs.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">{needs.map((s) => row(s, false))}</ul>
          ) : (
            <p className={cn("pt-3 text-[15px]", MUTED)}>
              {active.length === 1 ? "Your one subscription is on track." : `All ${active.length} on track.`}
            </p>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="subs-all"
            onClick={() => setOpen((o) => !o)}
            className={cn("mt-3 text-[13px] underline decoration-1 underline-offset-2 hover:text-[#16171C] dark:hover:text-white", MUTED, FOCUS)}
          >
            {open ? "Hide the list" : `Show all ${active.length}`}
          </button>
          {open && (
            <div id="subs-all">
              {(["monthly", "yearly"] as const).map((cadence) => {
                const group = active.filter((s) => s.sub.cadence === cadence);
                if (group.length === 0) return null;
                return (
                  <div key={cadence}>
                    <h3 className={cn("flex justify-between pb-2 pt-4 text-[13px] font-medium", MUTED)}>
                      {cadence === "monthly" ? "Monthly" : "Yearly"}
                      <span className="tabular-nums">
                        {eur.format(group.reduce((sum, s) => sum + price(s), 0))} {cadence === "monthly" ? "a month" : "a year"}
                      </span>
                    </h3>
                    <ul className="flex flex-col gap-2">{group.map((s) => row(s, true))}</ul>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
