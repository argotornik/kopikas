import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Trailing billing-period stamps ("Kaardi kuutasu 07-2026") make taught
// patterns that match exactly one charge ever — strip them wherever patterns
// are taught or read back.
const PERIOD_SUFFIX = /[\s·.,–—-]*\b(?:\d{2}[-/.]\d{4}|\d{4}[-/.]\d{2}(?:[-/.]\d{2})?)\s*$/

export function stripPeriod(s: string): string {
  return s.replace(PERIOD_SUFFIX, "").trim()
}

// Display label for the partner's fraction of a shared expense. Tolerant compare:
// thirds are stored as rounded decimals. Plain ASCII fractions — precomposed
// glyphs (½ vs ⅓) come from different fonts and render inconsistently.
export function shareLabel(f = 0.5): string {
  if (Math.abs(f - 0.5) < 0.01) return "1/2"
  if (Math.abs(f - 1 / 3) < 0.01) return "1/3"
  if (Math.abs(f - 0.25) < 0.01) return "1/4"
  return `${Math.round(f * 100)}%`
}
