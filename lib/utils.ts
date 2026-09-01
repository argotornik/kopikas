import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Display label for Anni's fraction of a shared expense. Tolerant compare:
// thirds are stored as rounded decimals. Plain ASCII fractions — precomposed
// glyphs (½ vs ⅓) come from different fonts and render inconsistently.
export function shareLabel(f = 0.5): string {
  if (Math.abs(f - 0.5) < 0.01) return "1/2"
  if (Math.abs(f - 1 / 3) < 0.01) return "1/3"
  if (Math.abs(f - 0.25) < 0.01) return "1/4"
  return `${Math.round(f * 100)}%`
}
