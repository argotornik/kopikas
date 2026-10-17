"use client";

import { useDraggable } from "@dnd-kit/core";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon } from "lucide-react";
import type { BoardTx } from "@/lib/board";
import { FOCUS, MUTED, eur, wrapperOf } from "@/components/coin-stage";
import { MerchantIcon } from "@/components/merchant-icon";
import { SPLITS } from "@/components/split-picker";
import { cn, shareLabel } from "@/lib/utils";

// The new board's charges, by day: every row's category opens the File menu,
// and a day's micro-investing round-ups fold into one line.

const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
// One File menu serves the whole list; the row that opened it is its payload.
const fileMenu = Menu.createHandle<string>();
const CHIP = "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium";
const ITEM =
  "flex cursor-default items-center gap-2.5 rounded-xl px-2.5 py-2 text-[15px] outline-none select-none data-highlighted:bg-[#F4F5F7] dark:data-highlighted:bg-[#2C2F3A]";

type Category = { name: string };
// What filing and splitting from a row hand to the page, with the row the coin hops from.
type Actions = {
  onFile: (tx: BoardTx, category: string, from: Element | null) => void;
  // Split with the partner, the household has one; null when it has none.
  partner: string | null;
  onSplit: (tx: BoardTx, share: number, from: Element | null) => void;
  onUnshare: (tx: BoardTx) => void;
  onEditMerchant: (tx: BoardTx) => void;
};

export function CoinLedger({ txs, categories, ...actions }: { txs: BoardTx[]; categories: Category[] } & Actions) {
  const days: { day: string; rows: BoardTx[]; micro: BoardTx[] }[] = [];
  for (const t of txs) {
    let d = days.at(-1);
    if (d?.day !== t.date) days.push((d = { day: t.date, rows: [], micro: [] }));
    (t.micro ? d.micro : d.rows).push(t);
  }
  return (
    <>
      {days.map((d) => (
        <div key={d.day}>
          <h3 className={cn("pb-1 pt-5 text-[13px] font-medium", MUTED)}>{dayName.format(new Date(d.day + "T00:00:00Z"))}</h3>
          <ul className="flex flex-col">
            {d.rows.map((t) => (
              <Row key={t.id} t={t} categories={categories} partner={actions.partner} onEditMerchant={actions.onEditMerchant} />
            ))}
            {d.micro.length > 0 && <RoundUps micro={d.micro} />}
          </ul>
        </div>
      ))}
      <FileMenu txs={txs} categories={categories} {...actions} />
    </>
  );
}

// A charge. Dragged by the mouse onto a roll, it files there; its category chip
// opens the File menu, which is the way in for the keyboard and for a finger.
function Row({
  t,
  categories,
  partner,
  onEditMerchant,
}: {
  t: BoardTx;
  categories: Category[];
  partner: string | null;
  onEditMerchant: (tx: BoardTx) => void;
}) {
  const split = t.shared && partner ? `${partner} pays ${shareLabel(t.partnerShare)}` : null;
  const sub = [split, t.note].filter(Boolean).join(" · ");
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, disabled: t.amount >= 0 });
  return (
    <li
      ref={setNodeRef}
      data-row={t.id}
      {...listeners}
      className={cn(
        "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl px-2 py-2.5 [contain-intrinsic-size:auto_56px] [content-visibility:auto] hover:bg-white sm:grid-cols-[28px_minmax(0,1fr)_150px_100px] dark:hover:bg-[#23252E]",
        t.amount < 0 && "cursor-grab select-none",
        isDragging && "opacity-40"
      )}
    >
      {/* The icon is the handle for the merchant's name and icon. Its click must not start a drag;
          the keyboard reaches the same editor through the File menu, so only money in keeps a tab stop here. */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => onEditMerchant(t)}
        tabIndex={t.amount < 0 ? -1 : undefined}
        aria-label={`Change the name or icon of ${t.name}`}
        title="Change name or icon"
        className={cn("rounded-full hover:ring-2 hover:ring-[#16171C]/20 dark:hover:ring-white/25", FOCUS)}
      >
        <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
      </button>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium">{t.name}</div>
        {sub && <div className={cn("truncate text-[13px]", MUTED)}>{sub}</div>}
      </div>
      {/* Under the name on a phone, in its own column from 640px. */}
      <div className="col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1">
        {t.amount >= 0 ? (
          <span className={cn("text-[13px]", MUTED)}>Received</span>
        ) : (
          <Menu.Trigger
            handle={fileMenu}
            payload={t.id}
            // A click files; it must not also start a drag of the row.
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`${t.category ?? "To file"}: file ${t.name}, ${eur.format(Math.abs(t.amount))}`}
            className={cn(
              CHIP,
              "cursor-pointer data-popup-open:ring-2 data-popup-open:ring-[#16171C]/20 dark:data-popup-open:ring-white/25",
              t.category
                ? "bg-white hover:bg-[#F4F5F7] dark:bg-[#23252E] dark:hover:bg-[#2C2F3A]"
                : "border-2 border-dashed border-[#16171C]/25 py-0.5 hover:border-[#16171C]/45 dark:border-white/25 dark:hover:border-white/45",
              FOCUS
            )}
          >
            {t.category && (
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: wrapperOf(categories, t.category, true) }} />
            )}
            <span className="truncate">{t.category ?? "To file"}</span>
          </Menu.Trigger>
        )}
      </div>
      <div
        className={cn(
          "col-start-3 row-start-1 text-right text-[15px] font-medium tabular-nums sm:col-start-4",
          t.amount >= 0 && "text-[#0A763F] dark:text-[#4FD18B]"
        )}
      >
        {t.amount >= 0 ? "+" : ""}
        {eur.format(t.amount)}
      </div>
    </li>
  );
}

// A day's round-ups as one quiet line: money moved to savings, not spent.
function RoundUps({ micro }: { micro: BoardTx[] }) {
  const out = micro.filter((t) => t.amount < 0);
  const total = out.reduce((s, t) => s + Math.abs(t.amount), 0);
  const n = out.length || micro.length;
  return (
    <li className={cn("flex items-baseline gap-2 px-2 py-2 text-[13px]", MUTED)}>
      <span className="min-w-0 flex-1 truncate">
        Round-ups · {n} {n === 1 ? "transfer" : "transfers"}
      </span>
      {total > 0 && <span className="tabular-nums">{eur.format(-total)} to Savings</span>}
    </li>
  );
}

// The categories a charge can go under, the one it has ticked. Picking one files
// it there at once, the way a coin goes into a roll; below them, its split with the
// partner, which works the same way.
function FileMenu({ txs, categories, onFile, partner, onSplit, onUnshare, onEditMerchant }: { txs: BoardTx[]; categories: Category[] } & Actions) {
  return (
    <Menu.Root handle={fileMenu}>
      {({ payload }) => {
        const tx = txs.find((t) => t.id === payload);
        return (
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="start" className="z-50 outline-none">
              <Menu.Popup className="max-h-[min(30rem,var(--available-height))] min-w-60 origin-[var(--transform-origin)] overflow-y-auto rounded-2xl bg-white p-1.5 text-[#16171C] ring-1 ring-[#16171C]/10 outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none dark:bg-[#23252E] dark:text-[#F3F2EE] dark:ring-white/10">
                {tx && (
                  <Menu.Group>
                    <Menu.GroupLabel className={cn("flex items-baseline gap-2 px-2.5 pb-1.5 pt-1 text-[13px]", MUTED)}>
                      <span className="truncate">File {tx.name}</span>
                      <span className="ml-auto shrink-0 tabular-nums">{eur.format(Math.abs(tx.amount))}</span>
                    </Menu.GroupLabel>
                    <Menu.RadioGroup
                      value={tx.category ?? ""}
                      onValueChange={(v) => {
                        if (v === tx.category) return;
                        const row = document.querySelector(`[data-row="${tx.id}"]`);
                        // Close first, so the menu has handed focus back before the coin hops.
                        fileMenu.close();
                        setTimeout(() => onFile(tx, String(v), row), 0);
                      }}
                    >
                      {categories.map((c) => (
                        <Menu.RadioItem key={c.name} value={c.name} closeOnClick className={ITEM}>
                          <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: wrapperOf(categories, c.name, true) }} />
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <Menu.RadioItemIndicator>
                            <CheckIcon aria-hidden className="size-4" />
                          </Menu.RadioItemIndicator>
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Group>
                )}
                {tx && partner && (
                  <>
                    <Menu.Separator className="mx-2.5 my-1 h-px bg-[#16171C]/10 dark:bg-white/10" />
                    <Menu.Group>
                      <Menu.GroupLabel className={cn("px-2.5 pb-1.5 pt-1 text-[13px]", MUTED)}>Split with {partner}</Menu.GroupLabel>
                      <Menu.RadioGroup
                        value={tx.shared ? String(SPLITS.find((f) => Math.abs(f - (tx.partnerShare ?? 0.5)) < 0.01) ?? "") : ""}
                        onValueChange={(v) => {
                          const row = document.querySelector(`[data-row="${tx.id}"]`);
                          fileMenu.close();
                          setTimeout(() => onSplit(tx, Number(v), row), 0);
                        }}
                      >
                        {SPLITS.map((f) => (
                          <Menu.RadioItem key={f} value={String(f)} closeOnClick className={ITEM}>
                            <span aria-hidden className="w-3 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              {partner} pays {shareLabel(f)}
                            </span>
                            <Menu.RadioItemIndicator>
                              <CheckIcon aria-hidden className="size-4" />
                            </Menu.RadioItemIndicator>
                          </Menu.RadioItem>
                        ))}
                      </Menu.RadioGroup>
                      {tx.shared && (
                        <Menu.Item className={ITEM} onClick={() => onUnshare(tx)}>
                          <span aria-hidden className="w-3 shrink-0" />
                          Take off Pooleks
                        </Menu.Item>
                      )}
                    </Menu.Group>
                  </>
                )}
                {tx && (
                  <>
                    <Menu.Separator className="mx-2.5 my-1 h-px bg-[#16171C]/10 dark:bg-white/10" />
                    <Menu.Item className={ITEM} onClick={() => onEditMerchant(tx)}>
                      <span aria-hidden className="w-3 shrink-0" />
                      Name and icon…
                    </Menu.Item>
                  </>
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        );
      }}
    </Menu.Root>
  );
}
