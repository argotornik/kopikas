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
