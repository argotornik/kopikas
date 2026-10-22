---
target: the coin tray board after the backlog, laptop and queue work (phone 390, 820–1920, 1470×830, 200% zoom; light and dark)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:1eb23174d772689155d6a88dea0e6dd5b457146406999723872f53617c99ff10"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-22T11-51-21Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data: October (the current month) is empty, so September was reviewed as the full month. Views: 1440×900 light and dark, 1920×1080, 1470×830, 1250×800, 1024×768, 820×1180, 720×450 at 2x (200% zoom), 390×844 phone light and dark (queue, Month, backlog), with filing exercised and data restored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Progress lines and live regions are good; backlog filings change nothing on the stage (another month shows); the queue's confirmation hides "57 filed · 5 to go" for 6 s after each tap |
| 2 | Match System / Real World | 3 | Coins, rolls and jars fit; the words drift between roll, category, charge and coin |
| 3 | User Control and Freedom | 3 | Undo, ⌘Z, Escape and Show all; the queue's Undo lasts 6 s; skips are lost on reload |
| 4 | Consistency and Standards | 2 | Three filing controls at 640–1023; the switch starts on only for a shop; a stack's notice has no Always; tab order doesn't follow the layout |
| 5 | Error Prevention | 3 | Always is opt-in; "All 5, always" counts coins in months you can't see; the rule it teaches is never previewed |
| 6 | Recognition Rather Than Recall | 3 | Rolls and menus labelled; pile coins anonymous until pointed at; queue tile amounts don't say which month |
| 7 | Flexibility and Efficiency | 2 | No multi-select, no key to file; 8 Tabs to the pile; the File… menu is 18 items and scrolls |
| 8 | Aesthetic and Minimalist Design | 3 | Beautiful; the stage still takes most of a laptop's first screen; wrapped floors leave air; two Show all links at once |
| 9 | Error Recovery | 3 | Errors named with retries |
| 10 | Help and Documentation | 2 | Nothing invites picking a coin or dragging a row, or explains Always's scope |
| **Total** | | **27/40** | **Acceptable (top of the band)** |

## Design Specificity Verdict

LLM: authored. The rolls encode data, the wrapper colours run through chips, menus and tiles, and the voice ("Where do I go?", "All sorted for September") is this product's. The painted world stops at the stage: the list, the File… menu and the cards are a competent but ordinary ledger, and the signature gesture has the weakest visuals (a 40px coin in a mostly empty 120px box). The phone queue is now the most product-specific screen. Biggest missed chance: the desktop backlog, where the 2000-charge afternoon happens, runs under the current month's empty floor.

Deterministic: CLI detect on 8 board files: exit 0, 0 findings (also with every option off); a control file gave 5. In-page detector on 8 views: nothing in 6; in 1440×1000 light and dark one first-viewport-column-overflow on the grid under the stage (weak: 134px above the fold; not at 1470×830), agreeing with the laptop issue; a dark-glow report was the overlay's own colour (false positive). No console errors, page overflow, clipped text or contrast failures (faded rolls' names ≥ 4.83:1). Inner sideways scroll: the floor's row at 820 (6px, the Shopping label column). Phone targets: Edit categories 38.5px; Investments, Go to September and Show all 13 at 43.5px; Open Pooleks inline (exempt); the All 5, always switch's tap area overlaps the Eating out tile by 3.8px. No user-visible overlay (headless only).

## Overall Impression

Last time's P1s are gone (the phone notice, the desktop backlog, the laptop stage): the first screen reaches the list and nothing moves under the pointer. What's left is the next layer of filing at volume: the backlog has no stage (no flight, gulp or growing roll), and every decision is a 13-way pick with no suggestion, though most shops go where they went last time.

## What's Working

1. The roll as a chart: one shared scale, the dashed limit jar, a sleeper for zero, the amounts always printed; choosing a roll fades only the paint.
2. The phone queue: progress first, one big coin, the tiles the only solid targets with mini rolls awake or asleep, a filing confirmed in its own line.
3. Keyboard and screen-reader groundwork: every coin and roll a button with a full name, a narrating live region, focus to the next coin or the month, menu typeahead, Escape puts a coin back.

## Priority Issues

1. [P1] The desktop backlog is disconnected from the stage. With To file on, the stage stays on the current month (an empty October at /); a July or September charge lands with no hop, gulp or growing roll, because file() has no roll on screen to aim at. Fix: step the stage to the charge's month when filing from the backlog, or fly to the roll anyway, or a backlog mode for the stage (progress in the head, the coin's month on the floor). Command: /impeccable shape.
2. [P1] Every filing decision is 13 equal choices with no suggestion: the floor, the queue's 13 tiles and the File… menu (18 items, scrolling), though the shop's previous category is known. Fix: rank by the shop's history and show the likely one first (a roll leaning to the held coin, a "Last time: Groceries" tile first, a Suggested group in the menu); splits into a submenu. Command: /impeccable distill.
3. [P2] The stage doesn't fit real laptops or a wrapped floor: a 1440×900 screen gives ~790px of viewport, so the charges' head (~815) still falls just under; 1024×768 and 1250×800 are all stage; at 820 and 200% zoom a wrapped floor's 230px shelves leave ~200px of air (stage ~3 screens at 200%). The detector's one finding agrees. Fix: floor height from the window's height (about 120–280px); each shelf its own height; lying bars below 1024. Commands: /impeccable layout, /impeccable adapt.
4. [P2] Filing controls and Always differ by place: a native select in the 640–1023 To file card; the switch on only for a shop; "All 5, always" counts other months while the stack shows 2; a stack's notice has no Always. Fix: the File… chip in that card; one default; spell out the scope ("All 5 from Pesumaja, 3 in other months"); Always after a stack. Command: /impeccable clarify.
5. [P2] Focus order and the keyboard path: from 1024 Tab passes Open Pooleks, Accept, Stop tracking and Show all 13 before the charges that sit left of them; the stage's switch is named only "All 5, always"; 8 Tabs to the pile. Fix: charges first in the page order (grid columns keep the layout); the queue's full name on the stage's switch; a key that focuses the first loose coin. Command: /impeccable harden.

## Persona Red Flags

Alex: no multi-select or key to file a focused row; splits at the bottom of an 18-item scrolling menu; ⌘Z undoes only the latest; a stack filed on the stage offers no Always.
Sam: Tab reaches Stop tracking before the list; at 200% the stage is ~1300px with an empty shelf; over a limit shows only as weight and a 12px "of 200 €", never the word "over"; the year strip's amounts only on hover or focus.
Casey: Undo for 6 s with no recent list; skips lost on reload; Savings and Other need a scroll per coin; the confirmation cuts the shop's name, not the category.
Owner with ~2000 charges: shop grouping with Always on is right, but each shop is still a 13-way pick; the stage is silent in the backlog; a rule's match is never previewed.

## Minor Observations

- Phone: Edit categories 38.5px; Investments, Go to September, Show all 13 at 43.5px; the Always switch's tap area overlaps the Eating out tile by 3.8px.
- 820: the floor's row scrolls 6px.
- Coin hover at 1440: a floater squiggle peeks from under the label pill (the Clear Air Rule).
- The stack label's "2 · 42,00 €" reads better as "2 charges · 42,00 €".
- "1842,16 €" beside "10 700,40 €" still contradicts DESIGN.md's thousands rule.
- An empty current month shows a glad coin and "nothing to file" while 5 wait elsewhere.
- Two Show all links while a roll is chosen.
- With 3 months of data, 9 of the year strip's 12 slots are blank under the dashed limit.
- The phone header's Pooleks icon has no visible label.

## Questions to Consider

- If the backlog is where the real filing happens, why isn't the stage the backlog's stage while To file is on?
- Should a coin ever face 13 equal rolls? Could the question become "Groceries?", with yes and "somewhere else"?
- In the first days of a month, should / open on twelve sleepers or on the last month that still has coins?
- Could tapping a roll open its charges right under it, on the stage?
