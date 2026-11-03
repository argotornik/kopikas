import { useSyncExternalStore } from "react";

// The latest change that can still be taken back, for ⌘Z, a notice's Undo and the phone queue's
// line. It lasts until the next change, not as long as the notice that offered it: every change
// that saves clears it (lib/act.ts), and one that can be taken back then sets it again.
export type LatestUndo = { what: string; run: () => void };

let latest: LatestUndo | null = null;
const readers = new Set<() => void>();

function set(next: LatestUndo | null) {
  latest = next;
  readers.forEach((redraw) => redraw());
}

export const rememberUndo = (what: string, run: () => void) => set({ what, run });
export const forgetUndo = () => latest && set(null);
export const latestUndo = () => latest;

export function useLatestUndo(): LatestUndo | null {
  return useSyncExternalStore(
    (redraw) => {
      readers.add(redraw);
      return () => readers.delete(redraw);
    },
    () => latest,
    () => null
  );
}
