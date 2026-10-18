---
version: 1
slug: "components-coin-board-tsx"
primary_target: "components/coin-board.tsx"
related_targets: ["app/page.tsx","components/coin-stage.tsx","components/coin-ledger.tsx","components/coin-queue.tsx","components/coin-year.tsx","components/coin-subscriptions.tsx","components/painted.tsx","components/coins-prototype.tsx","components/goofy.tsx","components/kopikas-mascot.tsx","components/kopikas-figure.ts","components/kopikas-painted.tsx","app/coins/sketch/page.tsx","app/coins/kopikas/page.tsx","app/stripes/page.tsx","components/stripes-prototype.tsx"]
---

# Board

Scope: the owner's board (`/`), the main Operate surface. Visitor mode: Operate. The household opens it in the evening on a laptop to see the month and file what came in; on the phone to clear the to-file queue.

Status: built and live at `/` since 2026-10-17, when the coin tray replaced the old board (`components/coin-board.tsx`, with the stage in `coin-stage.tsx`, the charges in `coin-ledger.tsx`, the phone queue in `coin-queue.tsx`). Every page around it wears the same look: Pooleks, Settings, the first run, sign-in, not found and couldn't open. The look is "Painted, after KAIA" (flat colour, gently uneven but vector-smooth edges, faces of two dots and a curve), after the work of the user's friend KAIA (@saiakuubik), who gave her okay to it on 2026-10-07; the README credits her. On a phone the board is two tabs, To file (one coin at a time) and Month, where the rolls lie down as bars in one list. The minimal rolls and coins are the cast: Kopikas left the painted stage on 2026-10-15 and the character pass was parked on 2026-10-17, so no new characters or silhouettes. Kopikas stays drawn on the prototypes; his Lottie file was removed on 2026-10-18. The prototypes are kept and save nothing: `/coins/sketch` (the painted and goofy looks; the goofy one, judged too goofy, is not to be extended), `/coins/kopikas` (his eight poses) and `/stripes` (striped skirts, not judged); `/coins` redirects to `/`. Audited on 2026-10-18 (16/20); its fixes and one type scale of eight steps are shipped.

Unresolved: Whether KAIA redraws the cast herself (if she does, her drawings go into the repo under the MIT licence, only if she agrees). The display face: Fredoka is provisional, and the user may name one from Free Faces. The width on an ultrawide screen (about 3400px), where the board stops at 2280px. How a household of any size appears; separate accounts for many households are a later project.

## Direction contract

THESIS: Every charge is a coin and every category a coin roll with a face. The month stands as a row of rolls whose heights are what was paid out, the loose change waits to be filed, and filing hops a coin into its roll. Refuses the finance dashboard of stat cards, sparklines and grey cards, and refuses the cold bank register: this is money as something you want to open.

OWN-WORLD: The coin tray in "The Picture-Book Ledger" (DESIGN.md): a white page with a warm Oat Paper stage (Night and Oat Paper Night in dark), matte painted wrapper colours, one per category, copper, brass and nickel coins, painted characters with faces of two dots and a curve, soft rounded panels, a few squiggles and dots floating around the loose change (never a dash, which means a limit, and never a coin, which would read as one more to file). Fredoka, rounded and bold, for headings and big figures; Rubik for text; tabular figures wherever amounts line up. The palette is recorded as built (2026-10-07), not the brighter white-and-saturated one first sketched.

STORY: The household opens the month, sees its rolls standing at their heights and the loose change still to file, picks a coin, drops it in a roll, and is cheered when everything is sorted.

FIRST VIEWPORT: Header: the coin and wordmark, the sync line, Pooleks, Settings, theme and the account menu. The stage, full width on an Oat Paper panel: the month name with a stepper, the month's total in the display face and one muted line of figures top left; the loose-change pile top right with its count; below, the rolls standing in a row across the stage on one shared scale, limits as dashed outlines, each roll's name and amount beneath. Below the stage, on one grid: every charge by day on the left, Pooleks and Subscriptions on the right. From 1900px the stage sits on the left, staying put on screens at least 800px tall, and the charges fill the right. On a phone it opens on To file while anything waits.

FORM: Coin tray, the roll's assigned direction (index 6 of the re-ranked grounded list), seed key 16ea225b, rendered in Family's register at the user's request. Signature move: pick a loose coin and tap a roll (or drag a charge's row onto a roll on desktop, or tap a tile in the phone queue); the coin hops along an arc, the roll springs taller and smiles. Motion grammar: springs, blinking faces, rolls rising on load, floating shapes; reduced motion keeps every state and drops the movement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
