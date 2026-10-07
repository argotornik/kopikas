"use client";

import { Field, Pending } from "@/components/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Pasting an LHV refresh token: the one field first run and Settings share.
// A form, so Enter submits; the button turns the coin while LHV is asked.
// What happens after a submit (open the board, or show a status) is the
// caller's.
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
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <div className="min-w-0 flex-1">
        <Field label="Refresh token">
          {(id) => (
            <Input
              id={id}
              type="password"
              name="lhv-refresh-token"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={describedBy}
              value={value}
              disabled={busy}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      </div>
      <Button type="submit" disabled={busy || !value.trim()}>
        <Pending on={busy}>{busy ? busyLabel : label}</Pending>
      </Button>
    </form>
  );
}
