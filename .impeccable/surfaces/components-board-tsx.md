---
version: 1
slug: "components-board-tsx"
primary_target: "components/Board.tsx"
related_targets: ["app/coins/page.tsx","components/coins-prototype.tsx","components/painted.tsx","components/goofy.tsx","components/kopikas-mascot.tsx","components/kopikas-figure.ts","components/kopikas-painted.tsx","components/kopikas-animated.tsx","app/coins/kopikas/page.tsx","app/stripes/page.tsx","components/stripes-prototype.tsx"]
---

# Board

Scope: the owner's board (`/`), the main Operate surface. Visitor mode: Operate. The household opens it in the evening on a laptop to see the month and file what came in; on the phone to clear the to-file queue.

Status: first-viewport prototypes, merged to `main` on 2026-10-07 and live beside the current board, which stays at `/`. Like the rest of Kopikas they sit behind the household sign-in, and they save nothing: `/stripes` (striped skirts, not judged) and `/coins` (this contract). On `/coins` the user prefers the painted look ("Painted, after KAIA": flat colour, gently uneven but vector-smooth edges, faces of two dots and a curve) over the goofy one, which they found too goofy; the goofy look stays one click away. The painted look follows the work of the user's friend KAIA (@saiakuubik), who gave her okay to it on 2026-10-07; the README credits her. On a phone the rolls lie down as horizontal blocks in one list. Kopikas, the coin with the k, is redrawn from the user's own character sheet: eight poses, one per moment of the board, each with its own lean, arms and face, live at `/coins/kopikas`. They are polished and exported as layered SVGs with a brief for Lottie Creator (`design/kopikas`); the board plays hello, jump and excited from `public/kopikas.lottie`, built from the same data as the code-drawn Kopikas by `npm run kopikas:lottie`, and draws every other moment in code. The animations are live on production since 2026-10-07; while the file loads, the drawn figure stays in place until the animation's first frame is painted, so Kopikas never blinks out. Their timing was picked from side-by-side versions and is live too: hello quicker (1.2 s), jump as built (0.9 s), excited softer (1.8 s a hop, with a rest between).

Unresolved: the other five animations (not made). Whether KAIA draws the cast herself is not settled. The display face (the user may name one from Free Faces). Pooleks, Settings and first run in this world; how a household of any size appears.

## Direction contract

THESIS: Every charge is a coin and every category a coin roll with a face. The month stands as a row of rolls whose heights are what was paid out, the loose change waits to be filed, and filing hops a coin into its roll. Refuses the finance dashboard of stat cards, sparklines and grey cards, and refuses the cold bank register: this is money as something you want to open.

OWN-WORLD: The coin tray drawn in Family's register: a clean white ground (ink-night in dark), bright saturated wrapper colours, one per category, copper, brass and nickel coins, flat geometric characters with dot eyes and small smiles, soft rounded panels, coins, stars and hearts floating behind the stage. Fredoka, rounded and bold, for headings and big figures; Rubik for text; tabular figures wherever amounts line up.

STORY: The household opens the month, sees its rolls standing at their heights and the loose change still to file, picks a coin, drops it in a roll, and is cheered when everything is sorted.

FIRST VIEWPORT: Header: the coin character and wordmark, the sync line, Pooleks, Settings, theme. The stage, full width on a soft panel: the month name with a stepper and the month's total in the display face top left; the loose-change pile at the left with its count; the rolls standing in a row across the stage on one shared scale, limits as dashed outlines, each roll's name and amount beneath. Below, on one grid: the ledger by day on the left, the to-file queue on the right.

FORM: Coin tray, the roll's assigned direction (index 6 of the re-ranked grounded list), seed key 16ea225b, rendered in Family's register at the user's request. Signature move: pick a loose coin and tap a roll (or choose in the queue); the coin hops along an arc, the roll springs taller and smiles. Motion grammar: springs, blinking faces, rolls rising on load, floating shapes; reduced motion keeps every state and drops the movement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
