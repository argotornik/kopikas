---
target: the coin tray board after the first-screen, count, phone queue, retry, menu width and heading work
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:2d06e7162735f4f090d3b4a5a895716ac11fe45a657f811a3bda809b59e9ea6c"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-26T07-02-22Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data runs July–September; September reviewed as the full month. Views: phone 390×844 (queue, Month, backlog), 820×1180, 1024×768, 1250×800, 1440×900 light and dark (/ and September), 1470×830, 1920×1080, 720×450 at 2x; filing exercised (keyboard loop, menus, typing, phone queue and Undo, server blocked, Try again) and data restored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Instant changes, progress everywhere, every step spoken; identical notices stack |
| 2 | Match System / Real World | 3 | Always needs its line; Pooleks unexplained |
| 3 | User Control and Freedom | 3 | Undo, ⌘Z, Escape, Skip; stage steps months on its own in To file |
| 4 | Consistency and Standards | 3 | Always default by entry point; Savings off the floor; heading renames for To file/Money in, not a roll |
| 5 | Error Prevention | 3 | Always scope, "also tracks it"; a roll without a coin filters |
| 6 | Recognition Rather Than Recall | 3 | usually goes, last-time ring, ↵; pile coins unlabelled until hovered |
| 7 | Flexibility and Efficiency | 3 | Many inputs; no bulk across shops; ≥4 keys per row |
| 8 | Aesthetic and Minimalist Design | 3 | Folded To file head empty; phone dead gap; floater dots as specks |
| 9 | Error Recovery | 3 | Excellent notice, but Try again on a list filing moves focus to the stage heading; error beside a stale success |
| 10 | Help and Documentation | 2 | Inline hints only; drag, stage typing, ⌘Z hidden |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

LLM: authored for this product; behaviour carries the metaphor; plain list and Pooleks card; the loose change is still a corner piece while coins wait.

Deterministic: CLI detect on 9 files exit 0 with 1 advisory (design-system-font-size: 11px "Last time" tag, coin-queue.tsx:288); control 5 findings. detect.js: clean on 7 views; first-viewport-column-overflow on 3 (the long charges list; false positive, heading in the first screen). No console errors, overflow, clipping; lowest contrast 4.80; phone taps ≥44px, no overlaps. Measured: charges heading inside the first screen at 1440 (69px clear), 1250 (49), 1024 (17), 1470 (69); File menu 320px before/after typing, no repeats, 12px from phone edges, overlaps the phone tab bar; picking/Always moves nothing (stage, phone Month, queue grid), no floater overlaps; To file 1024 side panel scrolls 33px inside, heading off the top at max scroll.

## Overall Impression

#7's fixes held. Held at 30 by the Try again focus regression, desktop opening on an empty month, and stacking notices. Biggest opportunity: desktop leads with the backlog.

## What's Working

1. Nothing only a picture: bold "16,54 € of 10 €", full roll labels.
2. One filing logic for every input: keyboard loop, last-time focus, shared typing order and Always line.
3. Honest and still: instant, honest rollback, reserved slots.

## Priority Issues

1. [P1] Desktop opens on an empty October while 5 coins wait elsewhere (12 sleepers, 0,00 €). Fix: open on the newest month with loose coins when the current month has none. Command: /impeccable clarify.
2. [P2] Focus gaps: Try again on a list filing sends focus to the stage heading (regression; retry from the row); phone focused Cash/Savings tiles under the tab bar (scroll padding); the floor's 12 tab stops. Command: /impeccable harden.
3. [P2] Notices stack: identical "Filed … under Home." twice with separate Undos; error beside a stale success; a notice covered the last row's chip at 1440. Fix: merge consecutive filings or replace. Command: /impeccable clarify.
4. [P2] A choice from 13 for shops never filed; Cash/Savings/Other below the phone fold. Fix: order by household use, rare ones last. Command: /impeccable distill.
5. [P3] Wasted air and specks: folded To file head; phone Month reserves ~80px before a pick; 7–8px floater dots. Command: /impeccable polish.

## Persona Red Flags

Alex: Tab, Enter, letters, Enter per row; filed chips are tab stops; no single-key filing or multi-select; up to 3 identical notices.
Sam: phone tiles under the tab bar when focused; Try again focus to the stage heading; Undo/Try again in timed notices (⌘Z covers Undo only).
Casey: Cash/Savings/Other below the fold; 13px Undo for 6 s; "See the month" opens on the empty month; File menu over the tab bar; /?cat=To file backlog ~900px down.
Owner (~2000): shop groups and File all right; long tail costs a 13-way choice each; side panel targets change by month; a celebration per month.

## Minor Observations

- Savings a tile and menu row but not on the floor.
- "To file" as both heading and pressed pill.
- Menu Enter silent when the only match is the current category.
- Delice logo vanishes in dark mode.
- Year strip mostly a dashed line with sparse data.
- Gone-quiet subscriptions offer only Stop tracking.
- Queue "Last time" tag at 11px, off the type scale.

## Questions to Consider

- What if desktop opened in the backlog whenever coins wait?
- Could a never-seen shop arrive with a guess?
- Should the loose change be the stage's protagonist while coins wait?
- Should celebrations scale with what they finish?
