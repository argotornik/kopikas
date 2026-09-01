import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Display label for Anni's fraction of a shared expense. Tolerant compare:
// thirds are stored as rounded decimals.
export function shareLabel(f = 0.5): string {
  if (Math.abs(f - 0.5) < 0.01) return "½"
  if (Math.abs(f - 1 / 3) < 0.01) return "⅓"
  if (Math.abs(f - 0.25) < 0.01) return "¼"
  return `${Math.round(f * 100)}%`
}
