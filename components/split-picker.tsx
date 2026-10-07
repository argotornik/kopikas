"use client";

import { useId } from "react";
import { cn, shareLabel } from "@/lib/utils";

// The partner's part of a shared expense: one of three. Used by the Pooleks
// zone on the board, the share prompt, and the add dialog on Pooleks, so the
// three read and behave the same.
const SPLITS = [0.5, 1 / 3, 0.25];

export function SplitPicker({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (fraction: number) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-2 text-xs text-muted-foreground", className)}>
      <span id={id}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex gap-1">
        {SPLITS.map((f) => {
          const on = Math.abs(value - f) < 0.01;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(f)}
              className={cn(
                "min-w-8 rounded-md border border-transparent px-2 py-0.5 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-shared/40 bg-shared/15 font-semibold text-shared" : "hover:bg-accent hover:text-foreground"
              )}
            >
              {shareLabel(f)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
