import { useId } from "react";
import { CircleAlertIcon } from "lucide-react";
import { CoinMark } from "@/components/coin-mark";

// A button's label while its request is out: the coin turns beside it, the
// one loading sign the app has. The label stays, so the button keeps its size.
export function Pending({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <>
      {on && <CoinMark turning className="size-4" />}
      {children}
    </>
  );
}

// Why a form didn't go through, said where the form is. role="alert" so it
// is read out as it appears; the icon carries the colour, the words stay at
// full contrast.
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs leading-snug text-foreground">
      <CircleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0 text-destructive" />
      <span>{message}</span>
    </p>
  );
}

// A form field with a label that stays: the placeholder is an example, never
// the only name. `hint` sits under the label for what the format needs.
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
