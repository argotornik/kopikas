"use client";

import { PaintedCoin } from "@/components/painted";
import { DISPLAY, FOCUS, INK, MUTED, OAT, PAGE, PANEL, PILL } from "@/components/coin-look";
import { coinFonts } from "@/components/coin-fonts";
import { cn } from "@/lib/utils";

// The page around sign-in: the coin, "Kopikas" and the tagline, then Clerk's card; with
// sign-in off (local development), a note that the board treats you as the owner.
export function SignInFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(coinFonts, PAGE)}>
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-5 py-10">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <PaintedCoin size={56} seed={3} />
          <p className={cn(DISPLAY, "text-[32px] font-semibold leading-tight")}>Kopikas</p>
          <p lang="et" className={cn("text-[15px] italic", MUTED)}>
            iga kopikas loeb
          </p>
        </div>
        {children ?? (
          <div className={cn(PANEL, OAT, "flex flex-col items-center gap-4 p-6 text-center")}>
            <p className={cn("text-[15px]", MUTED)}>Sign-in is off in local development, so the board treats you as the owner.</p>
            <a href="/" className={cn(PILL, INK, "inline-flex items-center", FOCUS)}>
              Open the board
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
