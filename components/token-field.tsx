"use client";

import { Field, Pending } from "@/components/form-status";
import { FOCUS } from "@/components/coin-stage";
import { INK, PILL } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// Pasting an LHV refresh token: the one field first run and Settings share, in the
// new look's white pill with an Ink button. A form, so Enter submits; the button turns
// the coin while LHV is asked. What happens after a submit (open the board, or show a
// status) is the caller's.
export function TokenField({
  value,
  onChange,
  onSubmit,
  busy,
  label,
  busyLabel,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  label: string;
  busyLabel: string;
  describedBy?: string;
}) {
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <div className="min-w-0 flex-1">
        <Field label="Refresh token">
          {(id) => (
            <input
              id={id}
              type="password"
              name="lhv-refresh-token"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={describedBy}
              value={value}
              disabled={busy}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                // A border of its own, so it shows on Oat (first run) and on white (Settings) alike.
                "h-12 w-full rounded-full border-2 border-[#16171C]/15 bg-white px-4 text-[16px] text-[#16171C] focus:border-[#16171C]/35 disabled:opacity-60 dark:border-white/15 dark:bg-[#23252E] dark:text-[#F3F2EE] dark:focus:border-white/35",
                FOCUS
              )}
            />
          )}
        </Field>
      </div>
      <button type="submit" disabled={busy || !value.trim()} className={cn(PILL, INK, "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-6", FOCUS)}>
        <Pending on={busy}>{busy ? busyLabel : label}</Pending>
      </button>
    </form>
  );
}
