// The new look's surfaces and pills, shared by the pages around the board. No "use client"
// here: a server component importing from a client module gets references, not the strings.
export const MUTED = "text-muted-text dark:text-muted-text-night";
export const PANEL = "rounded-[28px] bg-mist dark:bg-mist-night";
// In Tailwind 4 both outline-none and outline-hidden also cancel a later
// outline's style, so focus sets it back (outline-solid); without that, no
// control showed its focus. outline-hidden keeps a ring in forced colours.
export const FOCUS =
  "outline-hidden focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink dark:focus-visible:outline-chalk";
export const DISPLAY = "coins-display";
export const OAT = "bg-oat dark:bg-oat-night";
export const CARD = "bg-white dark:bg-card-night";
export const INK = "bg-ink text-white hover:bg-ink-hover disabled:opacity-40 dark:bg-chalk dark:text-ink dark:hover:bg-white";
export const WHITE = "bg-white hover:bg-mist dark:bg-card-night dark:hover:bg-card-night-hover";
export const PILL = "h-11 rounded-full px-5 text-[15px] font-medium";
export const INK_TEXT = "text-ink dark:text-chalk";
// A page of the new look: its faces, the white page and Ink text, in both themes.
export const PAGE = "relative isolate min-h-dvh overflow-x-clip bg-white text-ink selection:bg-sun/40 dark:bg-night dark:text-chalk";
