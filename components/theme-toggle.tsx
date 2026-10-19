"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@/components/header-icons";

// Icon visibility is CSS-driven (dark: variants), so SSR and client render
// identically — no mounted-state dance needed. Pressed, it gives a little like the
// header links beside it, in place of the Button's 1px nudge.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground active:not-aria-[haspopup]:translate-y-0 motion-safe:active:scale-[0.96]"
      title="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="size-4 dark:hidden" />
      <MoonIcon className="hidden size-4 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
