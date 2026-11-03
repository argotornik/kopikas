import { applyAction, type Action, type Applied } from "./apply";
import { buildBoard, packBoard } from "./board";
import { sharedView } from "./shared-view";
import { DEMO_ACCOUNTS, demoDb } from "./demo";
import { matches } from "./engine";
import { merchantOf, rulePattern } from "./icons";
import { settle, tips } from "./tips";
import type { Db } from "./types";

// The demo's household lives in this browser: changes are made here with the same function the
// server uses, and kept so a reload finds the board as it was left. A board kept from an earlier
// month starts over, since its loose change and dates belong to that month, and so does one kept
// by a deploy whose board was another version.
const KEY = "kopikas-demo";
// Raise it with any change to the board's shape (lib/types.ts) or to the made-up household
// (lib/demo.ts): a board kept by an earlier deploy may not build with this one's code.
const VERSION = 1;
let db: Db | null = null;
// Whether this page found a board kept from an earlier visit.
let found = false;
const month = () => new Date().toISOString().slice(0, 7);

function load(): Db {
  if (db) return db;
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (kept?.version === VERSION && kept.month === month()) {
      db = kept.db as Db;
      found = true;
    }
  } catch {
    // No storage (a private window, blocked site data): the board lasts as long as the tab.
  }
  return (db ??= demoDb());
}

function keep() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, month: month(), db }));
  } catch {
    // As above: kept in the tab only.
  }
}

export function demoView(view: "board" | "shared") {
  const d = load();
  settle();
  return view === "board" ? packBoard(buildBoard(d, new Date(), DEMO_ACCOUNTS)) : sharedView(d, "owner");
}

// The board as this browser left it, or nothing on a first visit (the server's board is right).
export function demoKept() {
  const d = load();
  settle();
  return found ? packBoard(buildBoard(d, new Date(), DEMO_ACCOUNTS)) : null;
}

// How many charges are still loose, as the To file count has it: none, and the tour's coin tips
// have nothing to show.
export function demoLeft() {
  return buildBoard(load(), new Date(), DEMO_ACCOUNTS).uncategorizedCount;
}

export function demoAct(action: Action, view?: "board" | "shared"): { result: Applied; fresh?: unknown } {
  const d = load();
  const result = applyAction(d, action, "owner", new Date().toISOString());
  if (!result.ok) return { result };
  keep();
  tell(d, action, result.changed.has("rules"));
  return { result, fresh: view ? demoView(view) : undefined };
}

// The tour hears about filings: which shop, where to, and whether Always took its other charges.
function tell(d: Db, action: Action, taught: boolean) {
  if (action.type !== "override" && action.type !== "override-many" && action.type !== "rule") return;
  const ids = action.type === "override-many" ? action.txIds : [action.txId];
  const tx = d.transactions.find((t) => t.id === ids[0]);
  if (!tx) return;
  const pattern = rulePattern(tx);
  const always = taught || (action.type === "override" && !!action.always);
  // Counted whole, not as "more": a coin on the stage holds its month's charges from the shop, one
  // in the phone's queue holds one, so only the whole count reads the same as the notice.
  const total = always && pattern ? d.transactions.filter((t) => t.amount < 0 && matches(t, pattern)).length : ids.length;
  tips.filed({ shop: merchantOf(tx, d.merchants).name, category: action.category, total, always });
}

// Start over: the made-up household as it arrived.
export function forgetDemo() {
  db = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing was kept.
  }
}
