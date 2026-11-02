"use client";

import type { ReactNode } from "react";
import { tips, useTour } from "@/lib/tips";
import { DEMO } from "@/lib/demo-flag";
import { DISPLAY, FOCUS } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// On a phone the demo's first tips are written in the queue's own lines, where the thumb is: the
// first in the line over the tiles (the queue keeps asking "Where do I go?"), the second in the
// label beside the Always switch; the progress line says which tip it is. The ring round the coin
// or the switch is drawn over it (components/demo-layer.tsx), and a screen reader hears the tip
// from there too, so these lines keep quiet.

// The crayon's words, in a blue dark enough to read on Oat Paper as text (4.6:1); the strokes keep
// the lighter crayon blue.
export const CRAYON_TEXT = "text-[#3D5FD0] dark:text-[#8FA6F0]";

function useQueueTip(always = false) {
  // Read only in the demo (a build-time constant, so the hooks never change order); everywhere
  // else the queue keeps its own words.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { step, filing } = DEMO ? useTour() : { step: "off" as const, filing: undefined };
  if (step === "pick" || step === "drop") return { n: 1, line: "This is a charge from the bank. Tap where it goes." };
  if (step === "always")
    return filing?.always
      ? { n: 2, label: "That's Always!", next: true }
      : { n: 2, label: always ? "Now tap where it goes" : "Try Always on this one", next: true };
  return null;
}

const crayon = cn(DISPLAY, CRAYON_TEXT, "font-semibold leading-tight");

export function QueueTipLabel({ children, always }: { children: ReactNode; always: boolean }) {
  const tip = useQueueTip(always);
  if (!tip?.label) return children;
  return (
    <p data-tip="label" aria-hidden className={cn(crayon, "text-[16px]")}>
      {tip.label}
    </p>
  );
}

// The first tip takes the line over the tiles while the switch is off; switched on, the line says
// what Always takes, as it always does.
export function QueueTipLine({ children, always }: { children: ReactNode; always: boolean }) {
  const tip = useQueueTip();
  if (!tip?.line || always) return children;
  return (
    <p aria-hidden className={cn(crayon, "text-pretty text-[16px] leading-[18px]")}>
      {tip.line}
    </p>
  );
}

export function QueueTipNote() {
  const tip = useQueueTip();
  if (!tip) return null;
  // 44px to press on a touch screen, as the tips over the page (components/demo-layer.tsx).
  const link = cn("relative underline underline-offset-2 hover:text-ink pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-[''] dark:hover:text-chalk", FOCUS);
  return (
    <span className="shrink-0 text-[12px]">
      Tip {tip.n} of 4 ·{" "}
      {tip.next && (
        <>
          <button type="button" onClick={() => tips.go("month")} className={link}>
            Next tip
          </button>{" "}
          ·{" "}
        </>
      )}
      <button type="button" onClick={() => tips.go("off")} className={link}>
        Skip the tips
      </button>
    </span>
  );
}
