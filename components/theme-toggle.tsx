"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@/components/header-icons";
import { FOCUS } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// Icon visibility is CSS-driven (dark: variants), so SSR and client render
// identically — no mounted-state dance needed. Pressed, it gives a little like the
// header links beside it, in place of the Button's 1px nudge; like them it is round, and it shows
// the board's Ink focus outline rather than the Button's grey ring.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8 rounded-full text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-0 motion-safe:active:scale-[0.96]", FOCUS)}
      title="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="size-4 dark:hidden" />
      <MoonIcon className="hidden size-4 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
