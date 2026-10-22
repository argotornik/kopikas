---
target: the coin tray board after the picks, celebration and polish (phone 390, 820, 1024–1920; light and dark)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:bb246eb38aef834d7d985061667c8f4c54376826a76ab7cf7dd108ac0ebc0125"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-22T09-32-01Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data: October (the current month) is empty, so September was reviewed as the full month. Views: 1440 light and dark, 1024, 1250, 820, 1920, 720 (200% zoom), 390 phone light and dark (To file, Month, a coin picked, a roll chosen), plus filing, the celebration and "All N, always" exercised with data restored after.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Coin label, live region, focus hand-off, "57 filed · 5 to go"; but choosing a roll at 1024–1899 filters a list that starts below the fold |
| 2 | Match System / Real World | 3 | Coins and rolls map well; "Loose change" collides with round-ups; "Today: Everyday 1842,16 €" reads as spending |
| 3 | User Control and Freedom | 3 | Undo everywhere, ⌘Z, Esc, Skip; letting go of a chosen roll is hidden or off-screen |
| 4 | Consistency and Standards | 2 | Four filing UIs and three models of Always (after-tap notice on pile and ledger, before-tap switch on the phone queue, none in the File… menu) |
| 5 | Error Prevention | 2 | On the phone the notice's Always and Undo sit over the next coin's tiles for 8 s |
| 6 | Recognition Rather Than Recall | 3 | Coins name themselves; deselecting a roll and ⌘Z must be remembered |
| 7 | Flexibility and Efficiency | 2 | No bulk filing on desktop: no grouping by shop, no multi-select, one Tab stop a row, drags can't scroll |
| 8 | Aesthetic and Minimalist Design | 3 | The stage is restrained; the figures line runs five items; tablet floors are mostly air |
| 9 | Error Recovery | 3 | Errors name the cause and offer a retry; refetch after a failed change |
| 10 | Help and Documentation | 2 | Nothing says coins pick up, rolls filter or Always exists until you act |
| **Total** | | **26/40** | **Acceptable (top of the band)** |

## Design Specificity Verdict

LLM: the stage is authored and could belong to no other product (rolls whose height is the money on one scale, sleepers on footprints, dashed-jar limits with a deepened overspend, the wow face instead of a frown, puzzled coins, a once-a-month celebration). Below it the vocabulary is standard (day-grouped list, Pooleks and Subscriptions cards). The metaphor stops where PRODUCT.md's success measure starts: filing gets the smallest objects on the stage (at most seven 40px coins in a 120px corner) and the total the biggest. Missed chance: a coin roll is a stack of identical coins, so same-shop charges should be stacks dropped in one go; the phone queue draws it, the desktop pile and To file list don't.

Deterministic: CLI detect on 8 board files: exit 0, 0 findings (also with --no-config); a control file reported findings. In-page detector across 6 views (1440 light/dark, chosen roll, 390 To file and Month, 820): nothing; control injection caught 4/4. No console errors, no page overflow, no clipped text. Contrast clean except the year strip's month letters before the first charge, 1.71:1 (disabled, exempt, hard to read). Phone targets: "Edit categories" 38.5px tall; "Investments", "Go to September", "Show all 13" 43.5px. At 820 the floor row scrolls 6px sideways. No false positives. No user-visible overlay (headless only).

## Overall Impression

The picks landed: coins name themselves, the phone files a whole shop, finishing is a moment. The weak links have moved: desktop has no way through a big backlog, and below 1900px the stage takes the whole first screen, hiding the list a chosen roll filters and stopping row drags from reaching the rolls.

## What's Working

1. The roll as a chart: one scale, floors so cents show, sleepers keep their place, the limit drawn and written.
2. The phone queue: progress first, the stack and "and 4 more from here", "All N, always" set before the tap and undone in one go, 56px tiles with each roll in miniature.
3. Status craft: labels in fixed slots, focus to the next coin, progress-first narration, views in the address, ⌘Z, a celebration that plays once and respects reduced motion.

## Priority Issues

1. [P1] Desktop has no tool for a large backlog. The pile shows at most 7 coins of one month; "To file · N" lists rows by day with a File… menu each; Always lives only in an 8 s notice (3 at a time); the File… menu has no Always. Fix: group To file by shop with one chip filing all; "All N, always" as the File… menu's first item; same-shop coins as stacks in the pile; "N filed · N to go" on desktop. Command: /impeccable shape.
2. [P1] Below 1900px the stage fills the first screen. At 1024–1440 the list starts at 866–905px, so a chosen roll filters unseen rows and "Show all" is off-screen; choosing a roll moves the floor 38px under the pointer; row drags can't scroll (coin-board.tsx:428 autoScroll={false}) and the stage only travels from 1900px. Fix: reserve the year strip's height in the figures slot; "Showing Groceries · 8 charges ↓ · Show all" on the stage; a shorter floor on short screens; auto-scroll for drags. Command: /impeccable layout.
3. [P1] On the phone the notice puts Always and Undo under the thumb: after each tile tap it covers the next coin's bottom tiles for 8 s. Fix: no Always in the queue's notice (the switch covers it); say "Filed under Home · Undo" inline or dock the notice above the coin. Command: /impeccable harden.
4. [P2] One task, four filing UIs, three models of Always (Subscriptions silently ignores the switch); filing from "To file · N" lands with no flight because the stage stays on the current month. Fix: one before-tap Always with the count everywhere; step the stage to a backlog row's month. Command: /impeccable distill.
5. [P2] At 640–1023px and 200% zoom the floor wraps 10 + 2 (8 + 4) on 230px shelves, so the second is ~85% air; the row scrolls 6px at 820. Fix: balance the shelves (6 + 6) or use the lying bars below 1024px. Command: /impeccable layout.

## Persona Red Flags

Alex: no multi-select or grouping by shop; Always gone after 8 s or 3 newer notices; the File… menu is 17–18 rows with no number keys; after picking a coin he tabs past the other coins and "Go to August" to reach a roll; ⌘Z is never shown.
Sam: tab order reaches Pooleks and Subscriptions before the charges, which sit left of them from 1024px; at 200% zoom the stage is ~2.2 screens of picture; choosing a roll changes a list far below without saying so where you are.
Casey: the notice covers the tiles; skips are lost on reload; on the Month tab a chosen roll filters a list ~2000px down.
Owner with ~2000 charges: desktop shows one month's pile, 7 coins at most; the backlog total sits below the fold; filing a whole shop exists only on the phone.

## Minor Observations

- Year strip letters before the first charge: 1.71:1 (disabled, exempt, nearly invisible).
- Phone: "Edit categories" 38.5px tall; three text buttons at 43.5px.
- et-EE groups thousands only from five digits ("1842,16 €" beside "10 700,40 €"); DESIGN.md's Tabular Rule promises a thousands space.
- "Every charge" stays the heading while the list shows To file, Money in or one roll.
- An empty current month shows the glad coin and "nothing to file" while 5 wait in other months.
- Dark: Home's brown nearly vanishes at 40% and as confetti.
- "Loose change" collides with round-ups; "Today:" reads as applying to Everyday only.
- Ledger rows show a grab cursor across the row; a click does nothing.
- Dead code: the parked Pooleks jar in coin-stage.tsx (jar, JarTarget, split, commitSplit, jarGulp); coin-year.tsx imports the retired goofy module.
- Dev only: the Next.js badge covers part of the To file tab.
- Not a defect: the queue's last tile clears the tab bar by 63px once scrolled.

## Questions to Consider

- If filing is the product, why is the total the biggest thing on the desktop stage and the waiting coins the smallest? Should the pile lead until the month is sorted?
- Why can't you drop a whole shop's stack in one move on the stage?
- Should Always be the default for a shop seen three or more times, with "just this one" the exception?
- Is the 1900px side-by-side layout the real desktop? Should stage-left, list-right start at 1280?
