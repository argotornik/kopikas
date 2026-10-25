---
target: the coin tray board after the Always, focus order and small-fix work
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:10c88c0f0a565f58c7067df3a59b02b39d0e31571b94c72adae897c155d7fac1"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-25T11-22-12Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data: October (the current month) is empty, so September was reviewed as the full month. Views: phone 390×844 (queue, Month, backlog; light and dark), 820×1180, 1024×768, 1250×800, 1440×900 light and dark, 1470×830, 1920×1080, 720×450 at 2x (200% zoom); filing exercised (including with the API blocked) and data restored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Clear progress lines, notices, coin labels and growing rolls; below 1900px a backlog filing lands in an off-screen roll |
| 2 | Match System / Real World | 3 | Coin-and-roll metaphor works; "Today: Everyday 1 842,16 €" reads oddly; money in has three names (Received, Money in, Incoming) |
| 3 | User Control and Freedom | 3 | Undo everywhere, ⌘Z, Esc, Skip, Show all; a failed save leaves untrustworthy numbers |
| 4 | Consistency and Standards | 3 | Very consistent visual system; the phone queue draws a stacked coin with its switch off; Savings in menus but no roll |
| 5 | Error Prevention | 3 | The Always line says what it files; a stack still writes a rule in one tap by default |
| 6 | Recognition Rather Than Recall | 3 | Last time and colours help; queue tile amounts switch month between coins unlabelled |
| 7 | Flexibility and Efficiency | 3 | Drag, keyboard menus, skip links, ⌘Z, shop grouping, URL views; no type-to-file, a 16-row menu per filing |
| 8 | Aesthetic and Minimalist Design | 3 | Beautiful stage; the Subscriptions alert stack dominates the side column and pushes the list down below 1024px |
| 9 | Error Recovery | 2 | Failed filing: no retry, wrong numbers stay, the visible notice blames a refresh |
| 10 | Help and Documentation | 2 | Good microcopy once acting; nothing invites picking a coin; row-to-roll drag only signalled by the cursor |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

LLM: highly specific above the fold (the stage: puzzled coins, painted rolls on one scale, the dashed limit jar, amounts always printed; the voice: "Where do I go?", "Loose change", "All sorted"), generic below it (Every charge rows with pill chips, the Pooleks card, the Subscriptions alert stack). The Pooleks jar drop target exists in the stage but is never enabled (known dead code).

Deterministic: CLI detect on 8 board files: exit 0, no findings (also with --no-config); a control file gave 5 findings. For TSX the detector only matches text patterns. In-page detect.js on 9 views: "No anti-patterns found" in each; a control page gave 9. Headless only, no user-visible overlay. No console errors, page overflow or inner sideways scrollers; no contrast below 4.5:1 (lowest 4.80 received green on oat, 4.83 muted on oat). Phone queue: nothing under 44px, no overlaps (the Always switch's tap ends 0.3px above the tile). Phone Month tab: the coin 40×40, "Open Pooleks" wraps to two 16px lines. 1024: two rows' sub-lines hide "payment". Coin picked at 1440: no decoration overlaps (closest 12.4px to the coin, 26.6px to the label).

## Overall Impression

The stage and the filing paths are the strongest part of the product: Always is clear and the same everywhere, the keyboard and phone paths are designed, not bolted on. What holds the score at 28 is around the stage: a failed save tells a happy story, the charges sit five screens down below 1024px, and the laptop backlog's reward happens off-screen. Biggest opportunity: make the laptop backlog feel like the stage.

## What's Working

1. The stage is information design and character at once: one shared scale, the limit jar, overspend deepened, amounts always as text; choosing a roll fades only the paint; confetti avoids every number.
2. Always is legible and reversible: one switch, a live line of what it takes in the same words everywhere, one Undo for the batch.
3. The keyboard and phone paths were built properly: two skip links, focus from a picked coin to Always to the rolls, Esc, menus returning focus; the queue's own status line.

## Priority Issues

1. [P1] A failed save shows wrong numbers and plays the celebration. With the server unreachable, filing the stack grew the roll, showed "All sorted", played confetti and dropped the count; two notices stacked, the visible one "The board couldn't refresh" with a reload. (A reachable server that answers with an error triggers a refetch that corrects the board.) Fix: keep the pre-change board and roll back on failure, celebrate after the server confirms, word the error around the filing with a retry, drop the second notice. Command: /impeccable harden.
2. [P1] Below 1024px, Every charge is buried: the list starts ~2 200px down at 820, at 200% zoom (~5 screens) and on the phone Month tab, after the To file card, Pooleks and five Subscriptions cards. Fix: stage, then charges, then Pooleks and Subscriptions; collapse Subscriptions into one line that opens. (Today's order was a deliberate choice.) Command: /impeccable layout.
3. [P1] On a laptop, filing from the backlog list loses its reward: at 1440×900 in To file the coin flies to an off-screen roll; the promise holds only from 1900px. Fix: in backlog mode below 1900px, pin a compact strip of rolls at the top while the list scrolls. Command: /impeccable adapt.
4. [P2] Every filing decision is a wall of 13 categories: the File menu's 16 rows scroll on a 900px laptop; Cash, Savings and Other below the fold in the phone queue. Fix: type-ahead in the menu, number keys on the stage and queue, categories by this shop's frequency. Command: /impeccable distill.
5. [P2] Last time follows the charge date, not the latest decision: after filing Pesumaja under Home, the next coin suggested Shopping from a later-dated earlier filing. Fix: use the most recently filed charge, falling back to the latest date. Command: /impeccable harden.

## Persona Red Flags

Alex: no type-to-file or number keys; a 16-row scrolling menu per charge; no multi-select across shops.
Sam: the phone Month tab's coin is 40×40 (both assessments); up to four live regions per filing; money-in rows add an icon tab stop spending rows lack; muted 13px secondary text; at 200% the stage is ~2 screens.
Casey: Cash, Savings, Other need a scroll per coin; the Always switch is top right; tile amounts switch month silently; skips lost on reload.
Owner with ~2000 charges: shop grouping and File all N are right; rolls off-screen on a laptop; Last time contradicts out-of-order decisions; no milestones between "57 filed" and an empty queue.

## Minor Observations

- The phone queue draws a stacked coin with "and 4 more from here" but its switch starts off (as picked: one charge off), though the coin reads as a group.
- Savings in the File menu and queue but no roll on the stage.
- 1024: two rows hide "payment" in "Partner pays 1/2 · Card payment".
- Phone: "Open Pooleks" wraps into two 16px halves.
- Year strip: 8 of 12 slots empty with 3 months of data; reads as decoration.
- Subscriptions: a late charge offers only Stop tracking; Apple and iCloud+ look duplicated (likely mock data).
- Dark mode: some favicons dark on dark.
- The default view is an empty current month (0,00 €, sleeping rolls, "5 in other months").

## Questions to Consider

- On a screen whose job is filing, should the loose change be the hero of the head, the total stepping back until the month is sorted?
- Should the laptop backlog be its own mode with a compact sticky floor?
- Could File… become type-to-file with the shop's last category preselected?
- Where are the milestones in a 2000-charge afternoon?
