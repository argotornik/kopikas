"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { DndContext, DragOverlay, MouseSensor, pointerWithin, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { Board, BoardTx } from "@/lib/board";
import { SAVINGS, SUBSCRIPTIONS, matches } from "@/lib/engine";
import { act, type Undo } from "@/lib/act";
import { announce, announceError, announceUndoable } from "@/components/toaster";
import { PaintedCoin } from "@/components/painted";
import { CoinStage, eur, label, looseCoins, monthOf, rollOnScreen, shortDate, usuallyOf, type CoinStageHandle } from "@/components/coin-stage";
import { DISPLAY, FOCUS, MUTED, OAT, PAGE, PANEL } from "@/components/coin-look";
import { CoinLedger, FileChip } from "@/components/coin-ledger";
import { CoinQueue, type Said } from "@/components/coin-queue";
import { CoinSubscriptions } from "@/components/coin-subscriptions";
import { CoinYear } from "@/components/coin-year";
import { CategoriesEditor, type CategoryAction } from "@/components/categories-editor";
import { MerchantEditor, type MerchantSubject } from "@/components/merchant-editor";
import { SnapshotEditor } from "@/components/snapshot-editor";
import { MerchantIcon } from "@/components/merchant-icon";
import { CoinHeader } from "@/components/coin-header";
import { PooleksIcon, SettingsIcon } from "@/components/header-icons";
import { cn, shareLabel } from "@/lib/utils";

// The board: the coin tray on top, the charges below, and on a phone the backlog one
// coin at a time.

// The list's view of money that came in, beside the categories a roll can pick.
const MONEY_IN = "money-in";
// The list's view of every charge still waiting to be filed, from every month.
const TO_FILE = "to-file";
// A skip link: hidden until Tab reaches it, then an Ink pill top left.
const SKIP = cn("sr-only rounded-full bg-ink text-[15px] font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-3 dark:bg-chalk dark:text-ink", FOCUS);
// Notices sit above the phone's tab bar. The editors' new look is `.coins-panel`, in globals.css.
const PANEL_CSS = `@media (max-width: 639px) { :root { --bottom-bar: 4.5rem; } }`;
// A row starts to drag only once the mouse has moved, so a click stays a click.
const MOUSE_DRAG = { activationConstraint: { distance: 5 } };

// When the last sync was, and whether it is late: a day and two hours without one
// means the bank connection wants a look.
function sinceLabel(iso: string | null | undefined): { ago: string; stale: boolean } | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ago =
    mins < 1
      ? "just now"
      : mins < 60
        ? rel.format(-mins, "minute")
        : mins < 48 * 60
          ? rel.format(-Math.round(mins / 60), "hour")
          : rel.format(-Math.round(mins / 1440), "day");
  return { ago, stale: mins > 26 * 60 };
}

export function CoinBoard({
  initial,
  syncedAt,
  fontClass,
  partner,
  view,
}: {
  initial: Board;
  syncedAt?: string | null;
  // The view from the address: a month, a category (or Incoming for money in) and a search.
  view?: { cat?: string; month?: string; q?: string };
  fontClass: string;
  // Who shared costs are split with; null for a household of one.
  partner: string | null;
}) {
  const [board, setBoard] = useState(initial);
  const [month, setMonth] = useState(() => {
    if (view?.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(view.month) && view.month <= initial.month) return view.month;
    // The backlog opens on the newest month that still has loose coins.
    const newest = view?.cat === "To file" ? looseCoins(initial.txs, null)[0] : undefined;
    return newest ? monthOf(newest.date) : initial.month;
  });
  // The phone has two tabs: To file, the backlog one coin at a time, and Month, the tray
  // with the charges below it. It opens on To file while anything waits, unless the
  // address asks for a view of the month. Wider screens show the month only, with the
  // loose change on the tray.
  const [tab, setTab] = useState<"queue" | "month">(() =>
    looseCoins(initial.txs, null).length > 0 && !view?.cat && !view?.month && !view?.q ? "queue" : "month"
  );
  const toFile = looseCoins(board.txs, null).length;
  const showTab = (t: "queue" | "month") => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  // Back to the first month with a charge; forward to this one.
  const months = useMemo(
    () => [board.txs.reduce((m, t) => (monthOf(t.date) < m ? monthOf(t.date) : m), initial.month), initial.month],
    [board.txs, initial.month]
  );
  const [synced, setSynced] = useState<{ ago: string; stale: boolean } | null>(null);
  useEffect(() => setSynced(sinceLabel(syncedAt)), [syncedAt]);
  const stage = useRef<CoinStageHandle>(null);
  // From 1900px the tray and the cards under it travel as one column beside the charges: they go
  // with the page until an edge reaches the window's, then hold there, the tray's top 20px from the
  // top edge or the cards' bottom 80px (the page's own bottom padding) from the bottom one. So
  // scrolling down keeps the rolls and the cards in view, scrolling up brings the month back, and a
  // list opened in the cards just reaches further down. Nor does the column rest lower than the
  // end of the grid the two sides share: the browser would stop the cards there and not the tray.
  // Only the two tops change while scrolling.
  const trayBox = useRef<HTMLDivElement>(null);
  const cardsBox = useRef<HTMLElement>(null);
  // Below 1900px nothing travels, so a row dragged up scrolls the page to the rolls; beside the
  // travelling stage the rolls are in view already, and scrolling would only fight the aim.
  const [travels, setTravels] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1900px)");
    const on = () => setTravels(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // From 1024px the side column sits beside the charges (the page's order is the same at every
  // width: the To file card, the charges, then the cards; the grid places them).
  const [listFirst, setListFirst] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setListFirst(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // With To file on, from 1024px up to 1900px (where the stage travels beside the list) the
  // month's rolls also stand as bars in the side column, beside the backlog; the stage draws them.
  const [sideEl, setSideEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const tray = trayBox.current, cards = cardsBox.current, grid = tray?.parentElement;
    if (!tray || !cards || !grid) return;
    let trayH = 0, columnH = 0, gridEnd = 0, hold = 20, lastY = window.scrollY;
    const place = (next: number) => {
      const low = Math.min(20, window.innerHeight - columnH - 80);
      hold = Math.min(20, gridEnd - lastY - columnH, Math.max(low, next));
      tray.style.top = `${hold}px`;
      cards.style.top = `${hold + trayH}px`;
    };
    const measure = () => {
      trayH = tray.offsetHeight;
      columnH = trayH + cards.offsetHeight;
      lastY = window.scrollY;
      gridEnd = grid.getBoundingClientRect().bottom + lastY;
      place(hold);
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (y === lastY) return;
      const next = hold - (y - lastY);
      lastY = y;
      place(next);
    };
    const watch = new ResizeObserver(measure);
    watch.observe(tray);
    watch.observe(cards);
    watch.observe(grid);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      watch.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const categories = board.categories;
  // One month at a time, as on the tray; the rest wait in their own months.
  const loose = looseCoins(board.txs, month);
  const looseElsewhere = looseCoins(board.txs, null).filter((t) => monthOf(t.date) !== month);
  const elsewhereMonth = looseElsewhere.map((t) => monthOf(t.date)).sort().at(-1);

  // The board after a change: what the server sent back with its answer, or a
  // fresh read. If the change saved but the read fails, the change still stands.
  // `quiet` after a change that failed: its own notice has said so already.
  const refetch = useCallback(async (quiet = false) => {
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setBoard(await res.json());
    } catch {
      if (!quiet) announceError("The board couldn't refresh. Reload to see the latest.", () => window.location.reload());
    }
  }, []);
  const run = useCallback(
    async (action: object) => {
      const result = await act<Board>(action, "board");
      if (result.ok) {
        if (result.fresh) setBoard(result.fresh);
        else await refetch();
      }
      return result;
    },
    [refetch]
  );

  // In the phone's queue a notice would sit over the next coin's tiles, so the queue says what
  // happened in its own line (`say`) with the same Undo and Always. The undo reports whether it
  // landed, so the line can say so.
  const takeBack = (undo: Undo | undefined) =>
    undo &&
    (async () => {
      const r = await act(undo);
      if (!r.ok) {
        announceError(`Couldn't undo that. ${r.error}`);
        return false;
      }
      await refetch();
      return true;
    });
  // A change shows before the server answers. One that doesn't save is taken back on the page, so
  // no number shows what isn't so (`filed`: how many it took off the count of charges to file);
  // the board is then read again quietly, in case the server kept it after all.
  const putBack = (before: BoardTx[], filed = 0) => {
    const old = new Map(before.map((t) => [t.id, t]));
    setBoard((b) => ({ ...b, txs: b.txs.map((t) => old.get(t.id) ?? t), uncategorizedCount: b.uncategorizedCount + filed }));
    void refetch(true);
  };
  // A notice's Try again pressed once its charges have changed since (filed again meanwhile, or
  // kept by the server after all) would undo the newer decision: it leaves them and says so.
  // `before`: the charges as they stood when the change failed.
  const now = useRef(board);
  useEffect(() => {
    now.current = board;
  });
  const retryUnlessChanged = (before: BoardTx[], retry: () => void) => () => {
    for (const was of before) {
      const t = now.current.txs.find((x) => x.id === was.id);
      if (!t || (t.category === was.category && t.shared === was.shared && t.partnerShare === was.partnerShare)) continue;
      return announce(t.category && t.category !== was.category ? `${t.name} is under ${t.category} now, so it stays there.` : `${t.name} has changed since, so it stays as it is.`);
    }
    retry();
  };

  // A coin files at once, as just this one: it is in its roll before the server
  // answers, and the notice offers Always beside Undo. The Subscriptions roll
  // tracks the charge as a subscription, which always means always. With Always set
  // before the tap (the phone queue's toggle), the shop's other loose charges go in too
  // and the rule is taught in the same request, so one Undo takes back all of it. It answers
  // whether the filing saved, so a celebration can wait for that; one that didn't is put back.
  const onFile = (tx: BoardTx, category: string, always = false, say?: (s: Said) => void): Promise<boolean> => {
    const subscription = category === SUBSCRIPTIONS;
    const wide = always && !subscription;
    const alike = new Set(wide ? looseCoins(board.txs, null).filter((t) => t.id !== tx.id && matches(t, tx.rulePattern)).map((t) => t.id) : []);
    const before = board.txs.filter((t) => t.id === tx.id || alike.has(t.id));
    setBoard((b) => ({
      ...b,
      txs: b.txs.map((t) =>
        t.id === tx.id
          ? { ...t, category, categorySource: "override" as const, filedAt: new Date().toISOString() }
          : alike.has(t.id)
            ? { ...t, category, categorySource: "rule" as const, filedAt: new Date().toISOString() }
            : t
      ),
      uncategorizedCount: b.uncategorizedCount - (tx.category ? 0 : 1) - alike.size,
    }));
    const saving = run(subscription ? { type: "subscribe", txId: tx.id } : { type: "override", txId: tx.id, category, ...(wide && { always: true }) });
    void saving.then((r) => {
      if (!r.ok) {
        putBack(before, (tx.category ? 0 : 1) + alike.size);
        announceError(
          `${subscription ? `Couldn't track ${tx.name} as a subscription.` : `Couldn't file ${alike.size ? `${alike.size + 1} from ` : ""}${tx.name} under ${category}.`} ${r.error}`,
          retryUnlessChanged(before, () => void onFile(tx, category, always, say))
        );
        return;
      }
      if (subscription)
        return say
          ? say({ lead: `Tracking ${tx.name}`, tail: " as a subscription", undo: takeBack(r.undo) })
          : announceUndoable(`Now tracking ${tx.name} as a subscription.`, r.undo, refetch);
      if (wide && say) return say({ lead: alike.size ? `Filed ${alike.size + 1} from ${tx.name}` : `Filed ${tx.name}`, tail: ` under ${category}, always`, undo: takeBack(r.undo) });
      if (say) return say({ lead: `Filed ${tx.name}`, tail: ` under ${category}`, undo: takeBack(r.undo), also: { label: "Always", onClick: () => void teachAlways(tx, category, say) } });
      if (wide)
        return announceUndoable(
          alike.size ? `Filed ${alike.size + 1} from ${tx.name} under ${category}, and every one to come.` : `Filed ${tx.name} under ${category}, and every one to come.`,
          r.undo,
          refetch
        );
      announceUndoable(`Filed ${tx.name} under ${category}.`, r.undo, refetch, {
        label: "Always",
        onClick: () => void teachAlways(tx, category),
      });
    });
    return saving.then((r) => r.ok);
  };
  // A shop's charges or a stack of coins, filed at once. With Always it is the first one's
  // Always filing, which takes the rest by its rule; without, they are pinned together, no
  // rule, one Undo takes them all back, and the notice offers Always as a single charge's does.
  // Subscriptions tracks the shop, always.
  const onFileMany = (txs: BoardTx[], category: string, always = false): Promise<boolean> => {
    if (txs.length === 1 || always || category === SUBSCRIPTIONS) return onFile(txs[0], category, always);
    const ids = new Set(txs.map((t) => t.id));
    const before = board.txs.filter((t) => ids.has(t.id));
    setBoard((b) => ({
      ...b,
      txs: b.txs.map((t) => (ids.has(t.id) ? { ...t, category, categorySource: "override" as const, filedAt: new Date().toISOString() } : t)),
      uncategorizedCount: b.uncategorizedCount - txs.filter((t) => !t.category).length,
    }));
    const saving = run({ type: "override-many", txIds: [...ids], category });
    void saving.then((r) => {
      if (!r.ok) {
        putBack(before, txs.filter((t) => !t.category).length);
        announceError(`Couldn't file ${txs.length} from ${txs[0].name} under ${category}. ${r.error}`, retryUnlessChanged(before, () => void onFileMany(txs, category, always)));
        return;
      }
      announceUndoable(`Filed ${txs.length} from ${txs[0].name} under ${category}.`, r.undo, refetch, {
        label: "Always",
        onClick: () => void teachAlways(txs[0], category),
      });
    });
    return saving.then((r) => r.ok);
  };
  const teachAlways = async (tx: BoardTx, category: string, say?: (s: Said) => void) => {
    const r = await run({ type: "rule", txId: tx.id, category });
    if (!r.ok)
      return announceError(
        `Couldn't send every ${tx.name} charge under ${category}. ${r.error}`,
        retryUnlessChanged(now.current.txs.filter((t) => t.id === tx.id), () => void teachAlways(tx, category, say))
      );
    if (say) return say({ lead: `Every ${tx.name} charge`, tail: ` now goes under ${category}`, undo: takeBack(r.undo) });
    announceUndoable(`Every ${tx.name} charge now goes under ${category}.`, r.undo, refetch);
  };

  // A split picked in a row's menu: shared at once, the notice offering Always (every
  // charge from this merchant) beside Undo. Splitting does not file: an unfiled charge
  // still needs a roll, and its coin wears its part in the pile.
  const onSplit = (tx: BoardTx, share: number, say?: (s: Said) => void) => {
    if (!partner) return;
    const before = board.txs.filter((t) => t.id === tx.id);
    setBoard((b) => ({ ...b, txs: b.txs.map((t) => (t.id === tx.id ? { ...t, shared: true, partnerShare: share } : t)) }));
    void run({ type: "share", txId: tx.id, partnerShare: share }).then((r) => {
      if (!r.ok) {
        putBack(before);
        return announceError(`Couldn't split ${tx.name} with ${partner}. ${r.error}`, retryUnlessChanged(before, () => onSplit(tx, share, say)));
      }
      const always = { label: "Always", onClick: () => void splitAlways(tx, share, say) };
      if (say) return say({ lead: `Split with ${partner}`, tail: `, who pays ${shareLabel(share)}`, undo: takeBack(r.undo), also: always });
      announceUndoable(`Split ${tx.name} with ${partner}, who pays ${shareLabel(share)}.`, r.undo, refetch, always);
    });
  };
  const splitAlways = async (tx: BoardTx, share: number, say?: (s: Said) => void) => {
    const r = await run({ type: "share", txId: tx.id, partnerShare: share, always: true });
    if (!r.ok)
      return announceError(
        `Couldn't split every ${tx.name} charge with ${partner}. ${r.error}`,
        retryUnlessChanged(now.current.txs.filter((t) => t.id === tx.id), () => void splitAlways(tx, share, say))
      );
    if (say) return say({ lead: `Every ${tx.name} charge`, tail: ` split with ${partner}`, undo: takeBack(r.undo) });
    announceUndoable(`Every ${tx.name} charge is now split with ${partner}.`, r.undo, refetch);
  };
  const onUnshare = (tx: BoardTx) => {
    if (!tx.shareId) return;
    void run({ type: "unshare", shareId: tx.shareId }).then((r) => {
      if (!r.ok) return announceError(r.error);
      announceUndoable(`Took ${tx.name} off Pooleks.`, r.undo, refetch);
    });
  };
  // The editors: categories (names, order, limits), a merchant's name and icon, and
  // the investments snapshot, as on the old board. Each says why when it cannot save.
  const [catsOpen, setCatsOpen] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const [merchantSubject, setMerchantSubject] = useState<MerchantSubject | null>(null);
  const tryPost = async (action: object) => {
    const r = await run(action);
    return r.ok ? null : r.error;
  };
  // A renamed category the list is showing stays shown under its new name.
  const editCategories = async (action: CategoryAction) => {
    const err = await tryPost(action);
    if (!err && action.type === "category-rename") setOnly((o) => (o === action.from ? action.to : o));
    return err;
  };
  const editMerchant = (t: BoardTx) =>
    setMerchantSubject({ key: t.id, name: t.name, domain: t.domain, emoji: t.emoji, pattern: t.merchantPattern, custom: t.customMerchant, target: { txId: t.id } });
  const dialogLook = cn(fontClass, "coins-panel rounded-[28px] p-6");

  // A subscription's actions, with an Undo where the server gives one.
  const subAction = (action: object, done: string) =>
    void run(action).then((r) => (r.ok ? announceUndoable(done, r.undo, refetch) : announceError(r.error)));

  // The month in words beyond the rolls: what came in, your share when something was
  // split, and the balances and investments as they stand today.
  const inMonth = (date: string) => monthOf(date) === month;
  const cameIn = board.txs.filter((t) => inMonth(t.date) && t.amount > 0 && !t.micro).reduce((sum, t) => sum + t.amount, 0);
  const partnerPaid = board.sharedItems.filter((i) => i.paidBy === "partner" && inMonth(i.date));
  const splitThisMonth = partnerPaid.length > 0 || board.txs.some((t) => inMonth(t.date) && t.amount < 0 && t.shared);
  const yourShare = splitThisMonth
    ? board.txs
        .filter((t) => inMonth(t.date) && t.amount < 0 && !t.micro && t.category !== SAVINGS)
        .reduce((sum, t) => sum - t.amount * (t.shared ? 1 - (t.partnerShare ?? 0.5) : 1), 0) +
      partnerPaid.reduce((sum, i) => sum + i.total * (1 - i.partnerShare), 0)
    : null;
  const accountName = (name: string) => {
    const n = name.replace(/^LHV · /, "");
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const standing = board.accounts.map((a) => ({ name: accountName(a.name), value: a.balance }));
  // Investments opens its snapshot editor; with none yet, the line offers to add one.
  const investments = (
    <button
      type="button"
      onClick={() => setSnapOpen(true)}
      className={cn("relative underline decoration-dotted decoration-1 underline-offset-2 hover:text-ink dark:hover:text-white pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:absolute pointer-coarse:after:content-['']", FOCUS)}
    >
      {board.investments.total != null ? "Investments" : "Add investments"}
    </button>
  );
  const amount = (v: number, tone = "text-ink dark:text-chalk", sign = "") => (
    <span className={cn("tabular-nums", tone)}>
      {sign}
      {eur.format(v)}
    </span>
  );
  // One line per time frame, each led by its name in Ink: the month's (what came in, and your share
  // when something was split), then today's (the balances and investments as they stand now).
  // Each figure keeps its name and amount together; a line breaks between them, after the dot, so
  // no line starts with one.
  const inLine = (parts: React.ReactNode[]) =>
    parts.map((part, i) => (
      <span key={i}>
        {i > 0 && "\u00a0· "}
        <span className="whitespace-nowrap">{part}</span>
      </span>
    ));
  const LEAD = "font-medium text-ink dark:text-chalk";
  const figures = (
    <>
      <div>
        <span className={LEAD}>{label(month)}:</span>{" "}
        {inLine([
          <>Received {cameIn > 0 ? amount(cameIn, "text-received dark:text-received-night", "+") : amount(cameIn)}</>,
          ...(yourShare != null ? [<>Your share {amount(yourShare)}</>] : []),
        ])}
      </div>
      <div className="mt-0.5">
        <span className={LEAD}>Today:</span>{" "}
        {inLine([
          ...standing.map((x) => (
            <>
              {x.name} {amount(x.value)}
            </>
          )),
          <>
            {investments}
            {board.investments.total != null && <> {amount(board.investments.total)}</>}
          </>,
        ])}
      </div>
    </>
  );

  // What the list shows: the month's charges, or one category's (picked on its
  // roll), or the money that came in. A search looks through every month.
  const [query, setQuery] = useState(view?.q ?? "");
  const [only, setOnly] = useState<string | null>(() => {
    const cat = view?.cat;
    return cat === "Incoming" ? MONEY_IN : cat === "To file" ? TO_FILE : cat && initial.categories.some((c) => c.name === cat) ? cat : null;
  });
  // The view goes into the address without a round trip; a moment late, so typing in
  // the search does not hit the browser's limit on address changes.
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (only) p.set("cat", only === MONEY_IN ? "Incoming" : only === TO_FILE ? "To file" : only);
      if (month !== initial.month) p.set("month", month);
      if (query.trim()) p.set("q", query.trim());
      const qs = p.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }, 200);
    return () => clearTimeout(t);
  }, [only, month, query, initial.month]);
  const q = useDeferredValue(query).trim().toLowerCase();
  const rows = board.txs
    .filter(
      (t) =>
        (q || only === TO_FILE ? true : monthOf(t.date) === month) &&
        (only === MONEY_IN ? t.amount > 0 : only === TO_FILE ? t.amount < 0 && !t.category && !t.micro : only ? t.category === only : true) &&
        (!q || [t.name, t.counterparty, t.description, t.note, t.category].join(" ").toLowerCase().includes(q))
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const out = rows.filter((t) => t.amount < 0 && !t.micro);
  const spent = out.reduce((s, t) => s - t.amount, 0);
  const received = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const toggle = (v: string) => setOnly((o) => (o === v ? null : v));
  // In the backlog the stage follows the charges, so every coin lands in a roll you can see grow:
  // it opens on the newest month that still has loose coins, steps to a row's month as the row is
  // filed, and once the month on show is sorted and its celebration has played, moves on to the
  // next. Browsing months by hand is left alone.
  const newestLoose = () => {
    const t = looseCoins(board.txs, null)[0];
    return t ? monthOf(t.date) : null;
  };
  const openBacklog = () => {
    const m = newestLoose();
    if (only !== TO_FILE && loose.length === 0 && m) setMonth(m);
    toggle(TO_FILE);
  };
  // A filing waiting for the stage to show its month; it runs a frame later, with the month's rolls on the page.
  const afterStep = useRef<(() => void) | null>(null);
  useEffect(() => {
    const run = afterStep.current;
    if (!run) return;
    afterStep.current = null;
    requestAnimationFrame(run);
  }, [month]);
  const inItsMonth = (m: string, run: () => void) => {
    if (only !== TO_FILE || m === month) return run();
    afterStep.current = run;
    setMonth(m);
  };
  const looseHere = useRef({ month, n: loose.length });
  useEffect(() => {
    const was = looseHere.current;
    looseHere.current = { month, n: loose.length };
    if (only !== TO_FILE || was.month !== month || was.n === 0 || loose.length > 0) return;
    const next = newestLoose();
    if (!next) return;
    const t = setTimeout(() => setMonth(next), 2800);
    return () => clearTimeout(t);
  }, [only, month, loose.length]);
  // The way from the stage down to the charges, and its links: a 44px tap area on a touch screen.
  const toCharges = () => {
    const list = document.getElementById("charges");
    list?.focus({ preventScroll: true });
    list?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const LINK = cn(
    "relative underline decoration-1 underline-offset-2 hover:text-ink dark:hover:text-white pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:content-['']",
    FOCUS
  );
  // Every loose charge, for the menus' "All N, always", and what's filed so far.
  const backlog = looseCoins(board.txs, null);
  const filed = board.txs.filter((t) => t.amount < 0 && !t.micro && t.category).length;
  const showing = only === MONEY_IN ? "Money in" : only === TO_FILE ? "To file" : only;
  // The roll the list is showing, if it is one: money in and the backlog are not rolls.
  const picked = only === MONEY_IN || only === TO_FILE ? null : only;
  const pill = (on: boolean) =>
    cn(
      "h-10 rounded-full px-4 text-[15px] font-medium pointer-coarse:h-11",
      on ? "bg-ink text-white dark:bg-chalk dark:text-ink" : "bg-white hover:bg-mist dark:bg-card-night dark:hover:bg-card-night-hover",
      FOCUS
    );

  // A ledger row dragged onto a roll files there, the same as a coin. Mouse only:
  // the keyboard and a finger file through the row's File menu.
  const sensors = useSensors(useSensor(MouseSensor, MOUSE_DRAG));
  const [dragged, setDragged] = useState<BoardTx | null>(null);
  const named = (id: unknown) => {
    const t = board.txs.find((x) => x.id === id);
    return t ? `${t.name}, ${eur.format(Math.abs(t.amount))}` : "the charge";
  };
  // A roll on the floor (roll:) or its bar in the side panel beside the backlog (side:).
  const rollOf = (id: unknown) => (typeof id === "string" && /^(roll|side):/.test(id) ? id.slice(5) : null);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragged(null);
    const tx = board.txs.find((t) => t.id === active.id);
    const category = rollOf(over?.id);
    if (!tx || !category || category === tx.category) return;
    // The coin drops in from the roll it was let go over.
    const roll = rollOnScreen(category);
    if (!stage.current?.file(tx, category, roll)) onFile(tx, category);
  };

  // The next loose coin is already waiting: filing one from the To file card moves focus to
  // the card row that took its place.
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const refocus = useRef<number | null>(null);
  useEffect(() => {
    if (refocus.current == null) return;
    const i = Math.min(refocus.current, chips.current.length - 1);
    refocus.current = null;
    chips.current[i]?.focus();
  });

  // A late sync says so under the name, and leads to the connection in Settings.
  const stale = synced?.stale && (
    <a href="/settings" className={cn("inline-flex items-center gap-1.5 text-[13px] hover:underline hover:underline-offset-2", FOCUS)}>
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-sun" />
      Last synced {synced.ago}. Check the connection
    </a>
  );

  return (
    <div
      className={cn(fontClass, PAGE)}
    >
      <div className="mx-auto max-w-[1200px] px-5 pb-28 sm:px-6 sm:pb-20 wide:max-w-[2280px] ultra:max-w-[2664px]">
        {/* Past the tray's rolls and the cards, to the list; on a phone, from either tab. */}
        <a
          href="#charges"
          onClick={(e) => {
            e.preventDefault();
            setTab("month");
            requestAnimationFrame(() => document.getElementById("charges")?.focus());
          }}
          className={SKIP}
        >
          Skip to the charges
        </a>
        {/* Straight to the month's first loose coin on the stage, ready to pick up; the phone's
            To file tab holds its coins already. */}
        {loose.length > 0 && (
          <a
            href="#month-heading"
            onClick={(e) => {
              e.preventDefault();
              [...document.querySelectorAll<HTMLElement>("[data-coin]")].find((c) => c.getBoundingClientRect().width > 0)?.focus();
            }}
            className={cn(SKIP, "max-sm:hidden")}
          >
            Skip to the loose change
          </a>
        )}
        <CoinHeader
          heading
          links={[
            { href: "/pooleks", label: "Pooleks", icon: PooleksIcon },
            { href: "/settings", label: "Settings", icon: SettingsIcon },
          ]}
          sub={stale ? <div className="mt-1 flex max-sm:hidden">{stale}</div> : synced && <p className={cn("mt-1 text-[13px]", MUTED)}>Synced {synced.ago}</p>}
        />
        {/* A phone gives the warning the full width: beside the icons it ran to three lines. */}
        {stale && <div className="-mt-1 mb-5 flex sm:hidden">{stale}</div>}

        <DndContext
          id="coin-board"
          sensors={sensors}
          collisionDetection={pointerWithin}
          autoScroll={!travels}
          onDragStart={({ active }) => setDragged(board.txs.find((t) => t.id === active.id) ?? null)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragged(null)}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Picked up ${named(active.id)}.`,
              onDragOver: ({ active, over }) => (rollOf(over?.id) ? `${named(active.id)} is over ${rollOf(over?.id)}.` : `${named(active.id)} is not over a roll.`),
              onDragEnd: ({ active, over }) => (rollOf(over?.id) ? `Filed ${named(active.id)} under ${rollOf(over?.id)}.` : `Put ${named(active.id)} back.`),
              onDragCancel: ({ active }) => `Put ${named(active.id)} back.`,
            },
          }}
        >
        <main>
          <div className={cn("sm:hidden", tab !== "queue" && "hidden")}>
            <CoinQueue txs={board.txs} categories={categories} partner={partner} onFile={onFile} onSplit={onSplit} onDone={() => showTab("month")} />
          </div>
          {/* From 1900px the month spreads out: the tray with the cards under it on the left,
              every charge on the right, so any row can be dragged onto a roll without
              scrolling back up. */}
          <div className={cn(tab === "queue" && "max-sm:hidden", "wide:grid wide:grid-cols-[1152px_minmax(0,1fr)] wide:grid-rows-[auto_1fr] wide:items-start wide:gap-x-8 ultra:grid-cols-[1536px_minmax(0,1fr)]")}>
          {/* The tray and the cards travel together beside the charges (see trayBox above), so a row
              anywhere in the list can still be dragged onto a roll and nothing goes under the tray.
              On an ultrawide the tray is drawn a third larger, the whole picture at once, while the
              charges keep their reading size. */}
          <div ref={trayBox} className="wide:col-start-1 wide:row-start-1 wide:pb-8 wide:sticky ultra:[&>section]:[zoom:1.3333]">
          {/* The stage: the month's rolls on one floor, its loose change beside them. */}
          <CoinStage
            ref={stage}
            txs={board.txs}
            categories={categories}
            month={month}
            months={months}
            currentMonth={initial.month}
            onMonthChange={setMonth}
            onFile={onFile}
            onFileMany={onFileMany}
            side={only === TO_FILE && listFirst && !travels ? sideEl : null}
            selected={picked}
            onSelect={toggle}
            // A chosen roll's year takes the figures' place; they come back when it is let go.
            figures={
              picked ? (
                <CoinYear
                  txs={board.txs}
                  categories={categories}
                  category={picked}
                  month={month}
                  currentMonth={initial.month}
                  earliest={months[0]}
                  onMonth={setMonth}
                />
              ) : (
                figures
              )
            }
            actions={
              <>
                {/* With a roll chosen, the stage says what the charges below are showing, the way down
                    to them, and the way to let it go: on a laptop the list starts under the fold. */}
                {picked && (
                  <p className={cn("mr-auto text-[13px]", MUTED)} aria-live="polite">
                    <span className="font-medium text-ink dark:text-chalk">Showing {picked}</span> ·{" "}
                    <button type="button" onClick={toCharges} className={cn(LINK, "no-underline hover:underline")}>
                      {rows.length} {rows.length === 1 ? "charge" : "charges"} in {q ? "every month" : label(month)} <span aria-hidden>↓</span>
                    </button>{" "}
                    ·{" "}
                    <button type="button" onClick={() => (setQuery(""), setOnly(null))} className={LINK}>
                      Show all
                    </button>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setCatsOpen(true)}
                  className={cn("relative rounded-full px-3.5 py-2 text-[15px] font-medium hover:bg-white dark:hover:bg-card-night pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']", FOCUS)}
                >
                  Edit categories
                </button>
              </>
            }
          />
          </div>

          {/* With To file on, the list's row hugs the list: the side column's rolls, taller than a short
              backlog, give their extra height to the cards' row below it, not to a gap above the cards. */}
          <div className={cn("mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] wide:contents", only === TO_FILE && "lg:grid-rows-[auto_1fr]")}>
            {/* The same loose change as the pile, as rows, from 640px to 1024px: under the stage and over
                the charges, the way to file from the keyboard. With To file on the list is the backlog,
                so the card steps aside. */}
            <section aria-labelledby="tofile-heading" className={cn(PANEL, OAT, "p-5 max-sm:hidden sm:p-6 lg:hidden", only === TO_FILE && "hidden")}>
              <h2 id="tofile-heading" className={cn(DISPLAY, "flex items-baseline justify-between text-[20px] font-semibold")}>
                To file
                <span className={cn("font-sans text-[13px] font-normal tabular-nums", MUTED)}>{label(month)}</span>
              </h2>
              {loose.length === 0 ? (
                <p className={cn("pt-3 text-[15px]", MUTED)}>Nothing loose in {label(month)}.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {loose.map((t, i) => (
                    <li key={t.id} data-queue={t.id} className="rounded-2xl bg-white p-3 dark:bg-card-night">
                      <div className="flex items-center gap-3">
                        <MerchantIcon name={t.name} domain={t.domain} emoji={t.emoji} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium">{t.name}</div>
                          <div className={cn("text-[13px]", MUTED)}>{shortDate.format(new Date(t.date + "T00:00:00Z"))}</div>
                        </div>
                        <div className="text-[15px] tabular-nums">{eur.format(t.amount)}</div>
                      </div>
                      {/* The list's File… chip and menu: Last time first, the switch, every category, the split. */}
                      <div className="mt-2.5">
                        <FileChip
                          t={t}
                          categories={categories}
                          card
                          ref={(el) => {
                            chips.current[i] = el;
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {elsewhereMonth && (
                <p className={cn("pt-3 text-[13px]", MUTED)}>
                  {looseElsewhere.length} more in other months.{" "}
                  <button
                    type="button"
                    onClick={() => setMonth(elsewhereMonth)}
                    className={cn("underline decoration-1 underline-offset-2 hover:text-ink dark:hover:text-white", FOCUS)}
                  >
                    Go to {label(elsewhereMonth)}
                  </button>
                </p>
              )}
            </section>
            <section
              id="charges"
              tabIndex={-1}
              aria-labelledby="ledger-heading"
              className={cn(PANEL, OAT, "min-w-0 scroll-mt-4 p-5 outline-none sm:p-6 lg:col-start-1 lg:row-start-1 wide:col-start-2 wide:row-span-2 wide:row-start-1")}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <h2 id="ledger-heading" className={cn(DISPLAY, "mr-auto text-[20px] font-semibold")}>
                  Every charge
                </h2>
                {/* The phone has its To file tab for the backlog, so the pill shows there only when a link turned it on. */}
                {(toFile > 0 || only === TO_FILE) && (
                  <button type="button" aria-pressed={only === TO_FILE} onClick={openBacklog} className={cn(pill(only === TO_FILE), only !== TO_FILE && "max-sm:hidden")}>
                    To file <span className="tabular-nums">· {toFile}</span>
                  </button>
                )}
                <button type="button" aria-pressed={only === MONEY_IN} onClick={() => toggle(MONEY_IN)} className={pill(only === MONEY_IN)}>
                  Money in
                </button>
                <div className="relative w-full sm:w-64">
                  <SearchIcon aria-hidden className={cn("pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2", MUTED)} />
                  <input
                    type="search"
                    name="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search every month"
                    aria-label="Search charges in every month"
                    className={cn(
                      "h-10 w-full rounded-full border-2 border-transparent bg-white pl-10 pr-10 text-[16px] pointer-coarse:h-11 placeholder:text-muted-text focus:border-ink/20 dark:bg-card-night dark:placeholder:text-muted-text-night dark:focus:border-white/25 [&::-webkit-search-cancel-button]:hidden",
                      FOCUS
                    )}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear the search"
                      className={cn("absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-mist dark:hover:bg-card-night-hover pointer-coarse:after:-inset-1.5 pointer-coarse:after:absolute pointer-coarse:after:content-['']", FOCUS)}
                    >
                      <XIcon aria-hidden className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              {(q || showing) && (
                <p className={cn("pt-3 text-[13px]", MUTED)} aria-live="polite">
                  {q
                    ? `${rows.length} ${rows.length === 1 ? "match" : "matches"}${showing ? ` in ${showing}` : ""}, every month`
                    : only === TO_FILE
                      ? (
                          // Progress first, as on the phone: what's done, then what's left.
                          <>
                            <span className="font-medium text-ink dark:text-chalk">{filed} filed</span> · {rows.length} to go, every month
                          </>
                        )
                      : `${showing}, ${label(month)}`}
                  {" · "}
                  <span className="tabular-nums">
                    {only === MONEY_IN ? `+${eur.format(received)}` : only === TO_FILE && !q ? eur.format(spent) : `${eur.format(spent)} spent`}
                  </span>
                  {" · "}
                  {/* Its tap area stops short of the search field above it. */}
                  <button type="button" onClick={() => (setQuery(""), setOnly(null))} className={cn(LINK, "pointer-coarse:after:-inset-y-3")}>
                    Show all
                  </button>
                </p>
              )}
              <CoinLedger
                txs={rows}
                categories={categories}
                backlog={backlog}
                byShop={only === TO_FILE}
                usually={(tx) => usuallyOf(board.txs, tx)}
                onFile={(tx, category, from, always) =>
                  inItsMonth(monthOf(tx.date), () => {
                    if (!stage.current?.file(tx, category, from, always)) onFile(tx, category, always);
                    else if (from?.hasAttribute("data-queue")) refocus.current = loose.findIndex((t) => t.id === tx.id);
                  })
                }
                onFileShop={(group, category, always) => inItsMonth(monthOf(group[0].date), () => onFileMany(group, category, always))}
                partner={partner}
                onSplit={(tx, share) => onSplit(tx, share)}
                onUnshare={onUnshare}
                onEditMerchant={editMerchant}
              />
              {rows.length === 0 && (
                <p className={cn("pt-4 text-[15px]", MUTED)}>
                  {q
                    ? `No charges match “${query.trim()}”.`
                    : only === MONEY_IN
                      ? `No money came in during ${label(month)}.`
                      : only === TO_FILE
                        ? "Every charge is filed."
                        : only
                          ? `Nothing in ${only} in ${label(month)} yet.`
                          : "No charges in this month yet."}
                </p>
              )}
            </section>
            <aside
              ref={cardsBox}
              className={cn(
                "flex flex-col gap-8 lg:col-start-2 lg:row-start-1 wide:col-start-1 wide:row-start-2 wide:grid wide:grid-cols-2 wide:items-start wide:sticky",
                // Under the list while the backlog's rolls take the side column.
                only === TO_FILE && "lg:col-start-1 lg:row-start-2"
              )}
            >
              {/* Who owes whom on the shared statement, until Pooleks gets its own place on the
                  tray. Splitting is in each row's menu. */}
              {partner && (
                <section aria-labelledby="pooleks-heading" className={cn(PANEL, OAT, "p-5 sm:p-6")}>
                  <h2 id="pooleks-heading" className={cn(DISPLAY, "flex items-baseline justify-between gap-3 text-[20px] font-semibold")}>
                    Pooleks
                    <span className={cn("font-sans text-[13px] font-normal", MUTED)}>with {partner}</span>
                  </h2>
                  <p className="pt-3 text-[15px] font-medium">
                    {board.sharedItems.length === 0 ? (
                      <span className={cn("font-normal", MUTED)}>Nothing shared yet.</span>
                    ) : board.balance === 0 ? (
                      "All square."
                    ) : board.balance > 0 ? (
                      <>
                        {partner} owes you <span className="tabular-nums">{eur.format(board.balance)}</span>
                      </>
                    ) : (
                      <>
                        You owe {partner} <span className="tabular-nums">{eur.format(-board.balance)}</span>
                      </>
                    )}
                  </p>
                  <p className={cn("pt-1 text-[13px]", MUTED)}>
                    Split a charge from its menu in the list.{" "}
                    <a href="/pooleks" className={cn(LINK, "inline-block")}>
                      Open Pooleks
                    </a>
                  </p>
                </section>
              )}
              <CoinSubscriptions
                subscriptions={board.subscriptions}
                monthly={board.monthlyBurn}
                month={initial.month}
                onAcceptPrice={(sub) =>
                  sub.lastCharge && subAction({ type: "accept-price", subId: sub.sub.id }, `${sub.label} now expects ${eur.format(sub.lastCharge.amount)}.`)
                }
                onStop={(sub) => subAction({ type: "unsubscribe", subId: sub.sub.id }, `Stopped tracking ${sub.label}.`)}
                onRename={(sub) =>
                  setMerchantSubject({
                    key: sub.sub.id,
                    name: sub.label,
                    domain: sub.domain,
                    emoji: sub.emoji,
                    pattern: sub.sub.match,
                    custom: sub.customMerchant,
                    target: { subId: sub.sub.id },
                  })
                }
                onCadence={(sub) => {
                  const cadence = sub.sub.cadence === "monthly" ? "yearly" : "monthly";
                  subAction({ type: "cadence", subId: sub.sub.id, cadence }, `${sub.label} moved to ${cadence}.`);
                }}
              />
            </aside>
            {only === TO_FILE && (
              <div className="max-lg:hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-stretch wide:hidden">
                <div ref={setSideEl} className={cn(PANEL, OAT, "sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6")} />
              </div>
            )}
          </div>
          </div>
        </main>
        {/* What the mouse carries: the charge as a coin, with its name and amount. */}
        <DragOverlay dropAnimation={null} style={{ width: "auto", height: "auto" }}>
          {dragged && (
            <div className="flex cursor-grabbing items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 text-[13px] font-medium ring-1 ring-ink/10 dark:bg-card-night dark:ring-white/10">
              <PaintedCoin size={30} mood="glad" seed={9} />
              <span className="max-w-[16rem] truncate">{dragged.name}</span>
              <span className="tabular-nums">{eur.format(Math.abs(dragged.amount))}</span>
            </div>
          )}
        </DragOverlay>
        </DndContext>
        {/* The phone's two tabs, in thumb reach. The active one wears the colour of the panel
            it shows, so it never outshines the coin above it. */}
        <nav aria-label="Board views" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:hidden dark:border-white/10 dark:bg-night">
          <div className="mx-auto flex max-w-md gap-2">
            {(["queue", "month"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => showTab(t)}
                className={cn(
                  "h-11 flex-1 rounded-full text-[15px] font-medium tabular-nums",
                  tab === t ? "bg-oat text-ink dark:bg-oat-night dark:text-chalk" : MUTED,
                  FOCUS
                )}
              >
                {t === "queue" ? (toFile > 0 ? `To file · ${toFile}` : "To file") : "Month"}
              </button>
            ))}
          </div>
        </nav>
        <style>{PANEL_CSS}</style>
        <CategoriesEditor
          open={catsOpen}
          categories={board.categories.map((c) => ({ name: c.name, budget: c.budget }))}
          onClose={() => setCatsOpen(false)}
          onAction={editCategories}
          className={dialogLook}
        />
        <MerchantEditor
          subject={merchantSubject}
          onClose={() => setMerchantSubject(null)}
          onSave={(fields) => tryPost({ type: "merchant", ...merchantSubject?.target, ...fields })}
          onReset={() => tryPost({ type: "merchant-reset", ...merchantSubject?.target })}
          className={dialogLook}
        />
        <SnapshotEditor
          open={snapOpen}
          latest={board.investments.latest}
          onClose={() => setSnapOpen(false)}
          onSave={(source, total, holdings, returnPct) => tryPost({ type: "snapshot", source, total, holdings, returnPct })}
          className={dialogLook}
        />
      </div>
    </div>
  );
}
