"use client";

import { useId } from "react";
import { cn, shareLabel } from "@/lib/utils";

// The partner's part of a shared expense: one of three, the same in a charge's menu on
// the board and in the add dialog on Pooleks.
export const SPLITS = [0.5, 1 / 3, 0.25];

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
                "min-h-8 min-w-10 rounded-full px-2.5 text-[13px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11 pointer-coarse:min-w-11",
                on ? "bg-primary font-medium text-primary-foreground" : "hover:bg-accent hover:text-foreground"
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
