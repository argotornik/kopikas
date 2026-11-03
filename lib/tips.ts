import { useSyncExternalStore } from "react";

// The demo's tour: where the visitor is in it, kept in the browser so a reload or a visit to
// Pooleks carries on from there. Each tip moves on when the visitor does what it says; the
// demo's own copy of the board reports filings here (lib/demo-browser.ts).
//   pick → drop → always → (month, on a phone) → year → pooleks → end, or off once skipped.

export type TipStep = "pick" | "drop" | "always" | "month" | "year" | "pooleks" | "end" | "off";
// What the filing that ended the first tips did: Always tells it, or asks for it. `total` is how
// many of the shop's charges are filed now, the coin's own among them.
export type Filing = { shop: string; category: string; total: number; always: boolean };
export type Tour = { step: TipStep; filing?: Filing };

const KEY = "kopikas-demo-tips";
const START: Tour = { step: "pick" };
// The server has no tour: nothing is drawn until the browser says where the visitor is.
const OFF: Tour = { step: "off" };
let tour: Tour | null = null;
const readers = new Set<() => void>();

function current(): Tour {
  if (tour) return tour;
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? "null");
    tour = kept?.step ? (kept as Tour) : START;
  } catch {
    tour = START;
  }
  return tour;
}

function set(next: Tour) {
  tour = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this tab only.
  }
  readers.forEach((redraw) => redraw());
}

export const tips = {
  go: (step: TipStep) => set({ ...current(), step }),
  restart: (from: TipStep = START.step) => set({ step: from }),
  // A filing in the demo. The first ends the pick-and-drop tips; one with Always answers the
  // tip that asked for it.
  filed(filing: Filing) {
    const { step, filing: before } = current();
    if (step === "pick" || step === "drop") set({ step: "always", filing });
    else if (step === "always" && !before?.always && filing.always) set({ step: "always", filing });
  },
};

// The demo bar's Show tips and Skip tips button, where the tour's controls start.
export const TIPS_BUTTON = "demo-tips";
// A tip's own button is gone once pressed. Pressed from a keyboard (a click with no detail), it
// hands focus to the bar's tips button first, so Tab carries on from the tour's controls (the
// tips come right after the bar) rather than from wherever the browser starts again.
export function handOff(e: { detail: number }) {
  if (e.detail === 0) document.getElementById(TIPS_BUTTON)?.focus({ preventScroll: true });
}

// Whether the page has its board as this browser left it (lib/demo-browser.ts says so once it has
// read it): the first tip waits for it, so it never rings a pile that is about to change.
let settled = false;
const waiting = new Set<() => void>();
export function settle() {
  if (settled) return;
  settled = true;
  waiting.forEach((go) => go());
  waiting.clear();
}
export function onSettled(go: () => void): () => void {
  if (settled) {
    go();
    return () => {};
  }
  waiting.add(go);
  return () => waiting.delete(go);
}

export function useTour(): Tour {
  return useSyncExternalStore(
    (redraw) => {
      readers.add(redraw);
      return () => readers.delete(redraw);
    },
    current,
    () => OFF
  );
}
