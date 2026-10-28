"use client";

import { Fragment, startTransition, useEffect, useId, useRef, useState, type Ref } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import type { BoardTx } from "@/lib/board";
import { SUBSCRIPTIONS, matches } from "@/lib/engine";
import { alwaysTakes, eur, nameMatches, typedOrder, wrapperOf } from "@/components/coin-stage";
import { FOCUS, INK, MUTED } from "@/components/coin-look";
import { MerchantIcon } from "@/components/merchant-icon";
import { PaintedCoin } from "@/components/painted";
import { SPLITS } from "@/components/split-picker";
import { cn, shareLabel } from "@/lib/utils";

// The new board's charges, by day: every row's category opens the File menu,
// and a day's micro-investing round-ups fold into one line. The backlog (To file) goes
// by shop instead: one row per shop, the most to clear first, whose chip files it all.

const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const weekdayMonth = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const day = (d: string) => dayMonth.format(new Date(d + "T00:00:00Z"));
// One File menu serves the whole list and the To file card; the row that opened it is its
// payload ("card:" before a card's), or for a shop "shop:" and the pattern its charges share.
const fileMenu = Menu.createHandle<string>();
// The list's File chips, in order (the To file card's are its own).
const fileChips = () => [...document.querySelectorAll<HTMLElement>("[data-file]")].filter((el) => el.getBoundingClientRect().width > 0);
// The list's chip a filing came from (`file`: its data-file), followed in case its row leaves the
// list: set by the File menu, and by a Try again of a filing made from the list (coin-board.tsx).
let left: { chip: HTMLElement; i: number; ids: string[]; category: string } | null = null;
export const followChip = (file: string, ids: string[], category: string) => {
  const chips = fileChips();
  const i = chips.findIndex((el) => el.dataset.file === file);
  if (i < 0) return null;
  left = { chip: chips[i], i, ids, category };
  return chips[i];
};
const CHIP = "relative inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:absolute pointer-coarse:after:content-['']";
// The board's menus: a white card of rows, as here and on Subscriptions. As tall as the window
// allows, so the File menu's thirteen categories only scroll on a short screen.
export const MENU_ITEM =
  "flex cursor-default items-center gap-2.5 rounded-xl px-2.5 py-2 text-[15px] outline-none select-none pointer-coarse:min-h-11 data-highlighted:bg-mist dark:data-highlighted:bg-card-night-hover";
export const MENU_POPUP =
  "max-h-[var(--available-height)] min-w-60 origin-[var(--transform-origin)] overflow-y-auto rounded-2xl bg-white p-1.5 text-ink ring-1 ring-ink/10 outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none dark:bg-card-night dark:text-chalk dark:ring-white/10";
export const MENU_SEPARATOR = "mx-2.5 my-1 h-px bg-ink/10 dark:bg-white/10";

type Category = { name: string };
// What filing and splitting from a row hand to the page, with the row the coin hops from.
type Actions = {
  // `always` files every loose charge from the shop and teaches the rule, as the queue's switch does.
  onFile: (tx: BoardTx, category: string, from: Element | null, always?: boolean) => void;
  // A shop's charges at once; with `always`, every one to come too.
  onFileShop: (txs: BoardTx[], category: string, always: boolean) => void;
  // Where the charge's shop usually goes, most often first, last time marked; offered first.
  // Empty for a shop never filed.
  usually: (tx: BoardTx) => { category: string; count: number; last: boolean }[];
  // The category names in the order filing offers them, the household's habit (byUse).
  order: string[];
  // Split with the partner, the household has one; null when it has none.
  partner: string | null;
  onSplit: (tx: BoardTx, share: number, from: Element | null) => void;
  onUnshare: (tx: BoardTx) => void;
  onEditMerchant: (tx: BoardTx) => void;
};

type Shop = { key: string; txs: BoardTx[]; total: number };

// A long list draws its first rows at once and the rest just after, in the background, so a busy
// month or a search through every month paints in a frame or two, and typing on cancels the rest.
// `list` names what is showing: the rows start over when it changes, not when one is filed away.
const FIRST = 50;
export function useInSteps(count: number, list: string) {
  // The list whose rows are all drawn.
  const [all, setAll] = useState<string | null>(null);
  useEffect(() => {
    if (all !== list && count > FIRST) startTransition(() => setAll(list));
  }, [all, list, count]);
  return all === list ? count : Math.min(count, FIRST);
}

export function CoinLedger({
  txs,
  categories,
  backlog,
  byShop = false,
  list: showing,
  ...actions
}: { txs: BoardTx[]; categories: Category[]; backlog: BoardTx[]; byShop?: boolean; list: string } & Actions) {
  // The shops whose charges are showing under their row.
  const [open, setOpen] = useState<string[]>([]);
  const shown = useInSteps(txs.length, showing);
  if (byShop) {
    const shops = new Map<string, BoardTx[]>();
    // A charge with no name to match others on (rulePattern "") is a shop of its own.
    for (const t of txs) {
      const key = t.rulePattern || t.id;
      shops.set(key, [...(shops.get(key) ?? []), t]);
    }
    const list: Shop[] = [...shops]
      .map(([key, group]) => ({ key, txs: group, total: group.reduce((sum, t) => sum - t.amount, 0) }))
      .sort((a, b) => b.txs.length - a.txs.length || b.total - a.total);
    const row = (t: BoardTx, inset = false) => (
      <Row key={t.id} t={t} categories={categories} partner={actions.partner} onEditMerchant={actions.onEditMerchant} inset={inset} />
    );
    return (
      <>
        <ul className="flex flex-col pt-3">
          {list.slice(0, shown).map((shop) =>
            shop.txs.length === 1 ? (
              row(shop.txs[0])
            ) : (
              <Fragment key={shop.key}>
                <ShopRow
                  shop={shop}
                  open={open.includes(shop.key)}
                  onToggle={() => setOpen((o) => (o.includes(shop.key) ? o.filter((k) => k !== shop.key) : [...o, shop.key]))}
                />
                {open.includes(shop.key) && shop.txs.map((t) => row(t, true))}
              </Fragment>
            )
          )}
        </ul>
        <FileMenu txs={txs} shops={list} backlog={backlog} categories={categories} {...actions} />
      </>
    );
  }
  const days: { day: string; rows: BoardTx[]; micro: BoardTx[] }[] = [];
  for (const t of txs.slice(0, shown)) {
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
      <FileMenu txs={txs} shops={[]} backlog={backlog} categories={categories} {...actions} />
    </>
  );
}

// A shop with several charges waiting: how many, from when and how much. Its name opens
// its charges under it; its chip, a little stack of coins, opens the File menu for them all.
function ShopRow({ shop, open, onToggle }: { shop: Shop; open: boolean; onToggle: () => void }) {
  const first = shop.txs[0];
  const dates = shop.txs.map((t) => t.date).sort();
  const n = shop.txs.length;
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl px-2 py-2.5 hover:bg-white sm:grid-cols-[28px_minmax(0,1fr)_150px_100px] dark:hover:bg-card-night">
      <MerchantIcon name={first.name} domain={first.domain} emoji={first.emoji} />
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn("min-w-0 rounded-lg text-left", FOCUS)}>
        <span className="block truncate text-[15px] font-medium">{first.name}</span>
        <span className={cn("block text-[13px]", MUTED)}>
          {n} charges · {day(dates[0])} – {day(dates[n - 1])}
        </span>
      </button>
      <div className="col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1">
        <Menu.Trigger
          handle={fileMenu}
          payload={`shop:${shop.key}`}
          data-file={`shop:${shop.key}`}
          aria-label={`File all ${n} from ${first.name}, ${eur.format(shop.total)}`}
          className={cn(CHIP, INK, "cursor-pointer pl-1 data-popup-open:ring-2 data-popup-open:ring-ink/20 dark:data-popup-open:ring-white/25", FOCUS)}
        >
          {/* A little stack: the shop's coins, still looking for their roll. */}
          <span aria-hidden className="relative -my-0.5 block h-5 w-[27px] shrink-0">
            <span className="absolute left-[7px] top-0">
              <PaintedCoin size={20} metal="brass" mood="puzzled" seed={4} />
            </span>
            <span className="absolute left-0 top-0">
              <PaintedCoin size={20} mood="puzzled" seed={3} />
            </span>
          </span>
          <span className="truncate">File all {n}…</span>
        </Menu.Trigger>
      </div>
      <div className="col-start-3 row-start-1 text-right text-[15px] font-medium tabular-nums sm:col-start-4">{eur.format(-shop.total)}</div>
    </li>
  );
}

// A charge's category chip, or for a loose one the Ink "File…" with a puzzled coin: it opens the
// File menu. The To file card's rows wear it too (`card`), so the coin hops from the card's row.
export function FileChip({ t, categories, card = false, ref }: { t: BoardTx; categories: Category[]; card?: boolean; ref?: Ref<HTMLButtonElement> }) {
  return (
    <Menu.Trigger
      ref={ref}
      handle={fileMenu}
      payload={card ? `card:${t.id}` : t.id}
      data-file={card ? undefined : t.id}
      // A click files; it must not also start a drag of the row.
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={`${t.category ? `${t.category}: file` : "File"} ${t.name}, ${eur.format(Math.abs(t.amount))}`}
      className={cn(
        CHIP,
        "cursor-pointer data-popup-open:ring-2 data-popup-open:ring-ink/20 dark:data-popup-open:ring-white/25",
        t.category ? "bg-white hover:bg-mist dark:bg-card-night dark:hover:bg-card-night-hover" : cn(INK, "pl-1"),
        FOCUS
      )}
    >
      {t.category ? (
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: wrapperOf(categories, t.category) }} />
      ) : (
        // A loose coin, puzzled like the ones in the pile; it fits the chip's line.
        <span aria-hidden className="-my-0.5 shrink-0">
          <PaintedCoin size={20} mood="puzzled" seed={(t.id.charCodeAt(t.id.length - 1) % 5) + 2} />
        </span>
      )}
      <span className="truncate">{t.category ?? "File…"}</span>
    </Menu.Trigger>
  );
}

// The queue's switch, as the first thing in a menu: set before the pick, it stays open. While
// it's on, a line under it says what it takes.
function AlwaysItem({ checked, onChange, takes }: { checked: boolean; onChange: (v: boolean) => void; takes: string }) {
  return (
    <Menu.CheckboxItem
      checked={checked}
      onCheckedChange={onChange}
      aria-label={`Always: ${takes}`}
      className="flex cursor-default flex-col items-start justify-center rounded-xl px-1.5 py-1 outline-none select-none pointer-coarse:min-h-11 data-highlighted:bg-mist dark:data-highlighted:bg-card-night-hover"
    >
      <span
        className={cn(
          "inline-flex h-[30px] items-center gap-1.5 rounded-full pl-2 pr-3 text-[13px] font-medium",
          checked ? "bg-ink text-white dark:bg-chalk dark:text-ink" : "bg-white inset-ring-[1.5px] inset-ring-ink/15 dark:bg-card-night dark:inset-ring-white/15"
        )}
      >
        <span aria-hidden className={cn("flex size-3.5 items-center justify-center rounded-full", checked ? "bg-white text-ink dark:bg-ink dark:text-chalk" : "inset-ring-[1.5px] inset-ring-ink/40 dark:inset-ring-white/40")}>
          {checked && <CheckIcon className="size-2.5" strokeWidth={3.5} />}
        </span>
        Always
      </span>
      {checked && (
        <span aria-hidden className={cn("max-w-72 px-1 pb-0.5 pt-1 text-[12px]", MUTED)}>
          {takes}
        </span>
      )}
    </Menu.CheckboxItem>
  );
}

// A charge. Dragged by the mouse onto a roll, it files there; its category chip
// opens the File menu, which is the way in for the keyboard and for a finger.
function Row({
  t,
  categories,
  partner,
  onEditMerchant,
  inset = false,
}: {
  t: BoardTx;
  categories: Category[];
  partner: string | null;
  onEditMerchant: (tx: BoardTx) => void;
  // Shown under its shop's row, set in a step.
  inset?: boolean;
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
        "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl px-2 py-2.5 [contain-intrinsic-size:auto_56px] [content-visibility:auto] hover:bg-white sm:grid-cols-[28px_minmax(0,1fr)_150px_100px] dark:hover:bg-card-night",
        t.amount < 0 && "cursor-grab select-none",
        inset && "pl-10",
        isDragging && "opacity-40"
      )}
    >
      {/* The icon is the handle for the merchant's name and icon. Its click must not start a drag;
          the keyboard reaches the same editor through the File menu, so only money in keeps a tab stop here.
          A charge with no pattern to give an identity can't have one, so its icon is only an icon. */}
      <button
        type="button"
        disabled={!t.merchantPattern}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => onEditMerchant(t)}
        tabIndex={t.amount < 0 ? -1 : undefined}
        aria-label={`Change the name or icon of ${t.name}`}
        title="Change name or icon"
        className={cn("relative rounded-full hover:ring-2 hover:ring-ink/20 disabled:pointer-events-none dark:hover:ring-white/25 pointer-coarse:after:-inset-2 pointer-coarse:after:absolute pointer-coarse:after:content-['']", FOCUS)}
      >
        <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
      </button>
      <div className="min-w-0">
        {/* Under its shop's row the name is said already; its day tells the charges apart. */}
        <div className="truncate text-[15px] font-medium">{inset ? weekdayMonth.format(new Date(t.date + "T00:00:00Z")) : t.name}</div>
        {sub && <div className={cn("line-clamp-2 text-[13px]", MUTED)}>{sub}</div>}
      </div>
      {/* Under the name on a phone, in its own column from 640px. */}
      <div className="col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1">
        {t.amount >= 0 ? (
          <span className={cn("text-[13px]", MUTED)}>Received</span>
        ) : (
          <FileChip t={t} categories={categories} />
        )}
      </div>
      <div
        className={cn(
          "col-start-3 row-start-1 text-right text-[15px] font-medium tabular-nums sm:col-start-4",
          t.amount >= 0 && "text-received dark:text-received-night"
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
// it there at once, the way a coin goes into a roll. A field at the top narrows them as you type,
// and Enter files the row lit with ↵; where the shop usually goes comes first; its split with the
// partner and its name sit below, the split in a submenu.
function FileMenu({
  txs,
  shops,
  backlog,
  categories,
  usually,
  order,
  onFile,
  onFileShop,
  partner,
  onSplit,
  onUnshare,
  onEditMerchant,
}: { txs: BoardTx[]; shops: Shop[]; backlog: BoardTx[]; categories: Category[] } & Actions) {
  // The switch for this opening of the menu; null is how it starts: on for a shop's charges,
  // off for one charge, as in the queue.
  const [always, setAlways] = useState<boolean | null>(null);
  // What the field has narrowed the categories to, for this opening of the menu.
  const [query, setQuery] = useState("");
  const find = useRef<HTMLInputElement>(null);
  // Enter's row is lit only while the field has focus: in the list, Enter takes the row it's on.
  const [inField, setInField] = useState(false);
  // Opened with a mouse or a keyboard, the menu starts in the field, ready to type. On a touch
  // screen it stays out of the menu's first focus, so the phone's keyboard waits for a tap on it.
  const [typeFirst, setTypeFirst] = useState(true);
  const hint = useId();
  // A filing can take its row out of the list (a loose charge in To file, one moved out of the
  // roll the list shows) while its chip has focus: focus goes on to the chip that took its
  // place, or to the list once nothing is left in it. A row still listed keeps it.
  useEffect(() => {
    const was = left;
    if (!was) return;
    if (was.chip.isConnected) {
      if (txs.some((t) => was.ids.includes(t.id) && t.category === was.category)) left = null;
      return;
    }
    left = null;
    if (document.activeElement && document.activeElement !== document.body) return;
    const chips = fileChips();
    (chips[Math.min(was.i, chips.length - 1)] ?? document.getElementById("charges"))?.focus();
  });
  const q = query.trim().toLowerCase();
  // Offered in the household's order; each keeps its colour from the list.
  const offered = order.map((name) => ({ name }));
  const shown = q ? offered.filter((c) => nameMatches(c.name, q)) : offered;
  // A category's row; Enter's (`target`) is lit with the stage's Ink ↵ tag.
  const item = (name: string, note?: string, target = false) => (
    <Menu.RadioItem key={name} value={name} closeOnClick className={cn(MENU_ITEM, target && inField && "bg-mist! dark:bg-card-night-hover!")}>
      <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: wrapperOf(categories, name) }} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {note && <span className={cn("shrink-0 text-[13px]", MUTED)}>{note}</span>}
      {target && inField && (
        <span aria-hidden className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[12px] font-medium text-white dark:bg-chalk dark:text-ink">
          ↵
        </span>
      )}
      <Menu.RadioItemIndicator>
        <CheckIcon aria-hidden className="size-4" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
  const LABEL = cn("px-2.5 pb-1 pt-1 text-[13px]", MUTED);
  // What a menu offers for a charge (a shop's: its first): where the shop usually goes, the list
  // under it, and Enter's category. Before typing, the list leaves out where it usually goes
  // (shown above it) and Enter files where it went last time; while typing, the matches come in
  // the stage's order (typedOrder) and Enter files the first. Never where the charge is already.
  const plan = (subject: BoardTx, current: string | null) => {
    const often = usually(subject).filter((o) => categories.some((c) => c.name === o.category));
    const list = q ? typedOrder(offered, q, often) : shown.filter((c) => !often.some((o) => o.category === c.name));
    const target = (q ? list.find((c) => c.name !== current)?.name : often.find((o) => o.last && o.category !== current)?.category) ?? null;
    return { often, list, target };
  };
  // Where the shop usually goes, in a group of its own (how often, the last one marked), then
  // the rest under "Every other category". A shop never filed gets neither: no guess, just the
  // categories; and once the field has letters in it, only what they match.
  const usuallyFirst = (name: string, often: ReturnType<Actions["usually"]>, current: string | null, target: string | null, pick: (v: string) => void) =>
    often.length > 0 && !q ? (
      <>
        <Menu.RadioGroup value={current ?? ""} onValueChange={(v) => pick(String(v))} aria-label={`Where ${name} usually goes`}>
          <div aria-hidden className={LABEL}>
            {name} usually goes
          </div>
          {often.map((o) => item(o.category, `${o.count === 1 ? "once" : `${o.count} times`}${o.last ? " · last time" : ""}`, o.category === target))}
        </Menu.RadioGroup>
        <Menu.Separator className={MENU_SEPARATOR} />
        <div aria-hidden className={LABEL}>
          Every other category
        </div>
      </>
    ) : null;
  // The field: letters narrow the categories and stay in it, not the menu's own jump-to-letter;
  // Enter files the lit row; the down arrow steps past Always to the first category (the up
  // arrow from there reaches it), and Escape closes, as in any menu.
  const findField = (pick: (v: string) => void, target: string | null) => (
    <div className="px-1.5 pb-1.5">
      <label className="flex h-10 items-center gap-2 rounded-xl bg-mist px-3 pointer-coarse:h-11 focus-within:ring-2 focus-within:ring-ink/20 dark:bg-mist-night dark:focus-within:ring-white/25">
        <SearchIcon aria-hidden className={cn("size-4 shrink-0", MUTED)} />
        <input
          ref={find}
          tabIndex={typeFirst ? undefined : -1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setInField(true)}
          onBlur={() => setInField(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              if (target) pick(target);
            } else if (e.key === "ArrowDown") {
              const first = e.currentTarget.closest("[role=menu]")?.querySelector<HTMLElement>("[role=menuitemradio]");
              if (!first) return;
              e.preventDefault();
              e.stopPropagation();
              first.focus();
            } else if (!["ArrowUp", "Escape", "Tab"].includes(e.key)) e.stopPropagation();
          }}
          placeholder="Type a category"
          aria-label="Find a category"
          aria-describedby={hint}
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-text dark:placeholder:text-muted-text-night"
        />
        {q && <span className={cn("shrink-0 text-[12px] tabular-nums", MUTED)}>{shown.length === 0 ? "none" : `${shown.length} of ${categories.length}`}</span>}
        <span id={hint} className="sr-only">
          {target ? `Enter files it under ${target}` : ""}
        </span>
      </label>
    </div>
  );
  return (
    <Menu.Root
      handle={fileMenu}
      onOpenChange={(o) => {
        if (!o) return;
        setAlways(null);
        setQuery("");
        setInField(false);
        const fine = window.matchMedia("(pointer: fine)").matches;
        setTypeFirst(fine);
        if (fine) requestAnimationFrame(() => requestAnimationFrame(() => find.current?.focus()));
      }}
    >
      {({ payload }) => {
        const shop = payload?.startsWith("shop:") ? shops.find((s) => `shop:${s.key}` === payload) : undefined;
        // A card's row may be filtered out of the list; it is loose, so it is in the backlog.
        const card = !!payload?.startsWith("card:");
        const id = card ? payload!.slice(5) : payload;
        const tx = shop ? undefined : (txs.find((t) => t.id === id) ?? backlog.find((t) => t.id === id));
        const on = always ?? !!shop;
        // An unfiled charge's shop: its other loose charges, which Always takes too.
        const alike = tx && !tx.category ? backlog.filter((t) => t.id !== tx.id && matches(t, tx.rulePattern)) : [];
        // The row the coin hops from: the card's, or the list's.
        const rowOf = (t: BoardTx) => document.querySelector(card ? `[data-queue="${t.id}"]` : `[data-row="${t.id}"]`);
        // The list's chip that opened the menu, followed in case its row leaves the list.
        const follow = (ids: string[], category: string) => void followChip(payload!, ids, category);
        const pickShop = (v: string) => {
          if (!shop) return;
          follow(shop.txs.map((t) => t.id), v);
          fileMenu.close();
          setTimeout(() => onFileShop(shop.txs, v, on && v !== SUBSCRIPTIONS), 0);
        };
        const pickTx = (v: string) => {
          if (!tx || v === tx.category) return;
          const row = rowOf(tx);
          follow([tx.id], v);
          // Close first, so the menu has handed focus back before the coin hops.
          fileMenu.close();
          setTimeout(() => onFile(tx, v, row, on && !tx.category), 0);
        };
        const { often, list, target } = shop ? plan(shop.txs[0], null) : tx ? plan(tx, tx.category ?? null) : { often: [], list: [], target: null };
        // While typing, Subscriptions says what else it does: Enter shouldn't start tracking unseen.
        const note = (name: string) => (q && name === SUBSCRIPTIONS && tx?.category !== SUBSCRIPTIONS ? "also tracks it" : undefined);
        return (
          <Menu.Portal>
            {/* 12px clear of the screen's edges, where a phone's edge would cut a row short. */}
            <Menu.Positioner sideOffset={6} align="start" collisionPadding={12} className="z-50 outline-none">
              {/* While the field has focus, Enter is its lit row's: the row the menu highlighted on a
                  keyboard opening shows plain. A row the mouse is on takes focus, so it still shows. */}
              <Menu.Popup
                // As wide as typing ever makes it ("3 of 13", "also tracks it"), so it never shifts under the pointer.
                className={cn(MENU_POPUP, "w-80 max-w-[var(--available-width)] [&:has(input:focus)_[data-highlighted]]:bg-transparent")}
                // The up arrow from the first row goes back to the field, as the down arrow left it.
                onKeyDownCapture={(e) => {
                  if (e.key !== "ArrowUp" || document.activeElement !== e.currentTarget.querySelector('[role^="menuitem"]')) return;
                  e.preventDefault();
                  e.stopPropagation();
                  find.current?.focus();
                }}
              >
                {shop && (
                  <Menu.Group>
                    <Menu.GroupLabel className={cn("flex items-baseline gap-2 px-2.5 pb-1.5 pt-1 text-[13px]", MUTED)}>
                      <span className="truncate">
                        File all {shop.txs.length} from {shop.txs[0].name}
                      </span>
                      <span className="ml-auto shrink-0 tabular-nums">{eur.format(shop.total)}</span>
                    </Menu.GroupLabel>
                    {findField(pickShop, target)}
                    <AlwaysItem
                      checked={on}
                      onChange={setAlways}
                      takes={alwaysTakes(shop.txs.length, backlog.filter((t) => matches(t, shop.key) && !shop.txs.includes(t)))}
                    />
                    <Menu.Separator className={MENU_SEPARATOR} />
                    {usuallyFirst(shop.txs[0].name, often, null, target, pickShop)}
                    <Menu.RadioGroup value="" onValueChange={(v) => pickShop(String(v))}>
                      {list.map((c) => item(c.name, note(c.name), c.name === target))}
                    </Menu.RadioGroup>
                    {q && shown.length === 0 && <div className={cn("px-2.5 py-2 text-[15px]", MUTED)}>No category matches &ldquo;{query.trim()}&rdquo;</div>}
                  </Menu.Group>
                )}
                {tx && (
                  <Menu.Group>
                    <Menu.GroupLabel className={cn("flex items-baseline gap-2 px-2.5 pb-1.5 pt-1 text-[13px]", MUTED)}>
                      <span className="truncate">File {tx.name}</span>
                      <span className="ml-auto shrink-0 tabular-nums">{eur.format(Math.abs(tx.amount))}</span>
                    </Menu.GroupLabel>
                    {findField(pickTx, target)}
                    {!tx.category && !!tx.rulePattern && (
                      <>
                        <AlwaysItem checked={on} onChange={setAlways} takes={alwaysTakes(1, alike)} />
                        <Menu.Separator className={MENU_SEPARATOR} />
                      </>
                    )}
                    {usuallyFirst(tx.name, often, tx.category ?? null, target, pickTx)}
                    <Menu.RadioGroup value={tx.category ?? ""} onValueChange={(v) => pickTx(String(v))}>
                      {list.map((c) => item(c.name, note(c.name), c.name === target))}
                    </Menu.RadioGroup>
                    {q && shown.length === 0 && <div className={cn("px-2.5 py-2 text-[15px]", MUTED)}>No category matches &ldquo;{query.trim()}&rdquo;</div>}
                  </Menu.Group>
                )}
                {tx && partner && (
                  <>
                    <Menu.Separator className={MENU_SEPARATOR} />
                    {/* The split folds into one row, so the menu needn't scroll; its row says the split it has. */}
                    <Menu.SubmenuRoot>
                      <Menu.SubmenuTrigger className={cn(MENU_ITEM, "data-popup-open:bg-mist dark:data-popup-open:bg-card-night-hover")}>
                        <span aria-hidden className="w-3 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Split with {partner}</span>
                        {tx.shared && <span className={cn("shrink-0 text-[13px] tabular-nums", MUTED)}>pays {shareLabel(tx.partnerShare)}</span>}
                        <ChevronRightIcon aria-hidden className="size-4 shrink-0" />
                      </Menu.SubmenuTrigger>
                      <Menu.Portal>
                        <Menu.Positioner sideOffset={4} alignOffset={-6} collisionPadding={12} className="z-50 outline-none">
                          <Menu.Popup className={MENU_POPUP}>
                            <Menu.RadioGroup
                              value={tx.shared ? String(SPLITS.find((f) => Math.abs(f - (tx.partnerShare ?? 0.5)) < 0.01) ?? "") : ""}
                              onValueChange={(v) => {
                                const row = rowOf(tx);
                                fileMenu.close();
                                setTimeout(() => onSplit(tx, Number(v), row), 0);
                              }}
                            >
                              {SPLITS.map((f) => (
                                <Menu.RadioItem key={f} value={String(f)} closeOnClick className={MENU_ITEM}>
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
                              <Menu.Item className={MENU_ITEM} onClick={() => onUnshare(tx)}>
                                <span aria-hidden className="w-3 shrink-0" />
                                Take off Pooleks
                              </Menu.Item>
                            )}
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.SubmenuRoot>
                  </>
                )}
                {tx?.merchantPattern && (
                  <>
                    <Menu.Separator className={MENU_SEPARATOR} />
                    <Menu.Item className={MENU_ITEM} onClick={() => onEditMerchant(tx)}>
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
