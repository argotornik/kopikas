"use client";

import type { ReactNode } from "react";
import { tips, useTour } from "@/lib/tips";
import { DEMO } from "@/lib/demo-flag";
import { DISPLAY, FOCUS } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// On a phone the demo's first tips are written in the queue's own lines, where the thumb is:
// the label over the tiles says what to try, the progress line says which tip it is. The ring
// and the arrow round the Always switch are drawn over it (components/demo-layer.tsx).

function useQueueTip() {
  // Read only in the demo (a build-time constant, so the hooks never change order); everywhere
  // else the queue keeps its own words.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { step, filing } = DEMO ? useTour() : { step: "off" as const, filing: undefined };
  if (step === "pick" || step === "drop") return { n: 1, label: "Try Always first" };
  if (step === "always") return filing?.always ? { n: 2, label: "That's Always!", next: true } : { n: 2, label: "Try Always on this one", next: true };
  return null;
}

export function QueueTipLabel({ children }: { children: ReactNode }) {
  const tip = useQueueTip();
  if (!tip) return children;
  return (
    <p data-tip="label" className={cn(DISPLAY, "text-[17px] font-semibold leading-tight text-[#4C6FE0] dark:text-[#8FA6F0]")}>
      {tip.label}
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
