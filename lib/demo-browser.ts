import { applyAction, type Action, type Applied } from "./apply";
import { buildBoard, packBoard } from "./board";
import { sharedView } from "./shared-view";
import { DEMO_ACCOUNTS, demoDb } from "./demo";
import type { Db } from "./types";

// The demo's household lives in this browser: changes are made here with the same function the
// server uses, and kept so a reload finds the board as it was left. A board kept from an earlier
// month starts over, since its loose change and dates belong to that month.
const KEY = "kopikas-demo";
let db: Db | null = null;
const month = () => new Date().toISOString().slice(0, 7);

function load(): Db {
  if (db) return db;
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (kept?.month === month()) db = kept.db as Db;
  } catch {
    // No storage (a private window, blocked site data): the board lasts as long as the tab.
  }
  return (db ??= demoDb());
}

function keep() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ month: month(), db }));
  } catch {
    // As above: kept in the tab only.
  }
}

export function demoView(view: "board" | "shared") {
  const d = load();
  return view === "board" ? packBoard(buildBoard(d, new Date(), DEMO_ACCOUNTS)) : sharedView(d, "owner");
}

export function demoAct(action: Action, view?: "board" | "shared"): { result: Applied; fresh?: unknown } {
  const result = applyAction(load(), action, "owner", new Date().toISOString());
  if (!result.ok) return { result };
  keep();
  return { result, fresh: view ? demoView(view) : undefined };
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
