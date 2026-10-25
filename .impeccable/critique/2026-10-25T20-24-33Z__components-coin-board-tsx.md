---
target: the coin tray board after the typing engine, backlog mode, phone stillness, figures, pile, headings and shelves work
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:875e78fc235ec2d44570fe50971c4827adbd24ccefa3ceef3e4b003cf4d445d8"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-25T20-24-33Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data runs July–September; September reviewed as the full month. Views: phone 390×844 (queue, Month, backlog), 820×1180, 1024×768, 1250×800, 1440×900 light and dark, 1470×830, 1920×1080, 720×450 at 2x; filing exercised (keyboard loop, menus, typing, server blocked, Try again) and data restored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | October head says "nothing to file" while 5 wait elsewhere; a Try-again success lands without stage feedback |
| 2 | Match System / Real World | 3 | "nothing to file" misleads; "Every charge" heads the To file backlog |
| 3 | User Control and Freedom | 3 | Undo + ⌘Z, Escape, guarded Try again; phone queue Undo at the top for 6 s |
| 4 | Consistency and Standards | 3 | One menu, one Always line, one typing order; Always default off in the queue, on for a stage stack / File all |
| 5 | Error Prevention | 3 | Always states scope, "also tracks it"; dense 13-tile phone grid |
| 6 | Recognition Rather Than Recall | 3 | usually goes, last time, ↵ tags; year strip unlettered |
| 7 | Flexibility and Efficiency | 3 | Four keys per charge, typing, drag, File all; no multi-select; 12 roll stops |
| 8 | Aesthetic and Minimalist Design | 3 | Distinctive; the stage fills a laptop's first screen with ~100px dead band |
| 9 | Error Recovery | 4 | Rollback, named cause, Try again redoes exactly that filing |
| 10 | Help and Documentation | 2 | Hints in place; ⌘Z never surfaced, no help |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

LLM: authored for this product (amount-height rolls, limit jars, deepened overspend, puzzled/smiling coins, one voice). Generic parts deliberately generic; Pooleks card weakest; desktop doesn't lead with the backlog like the phone.

Deterministic: CLI detect on 9 files exit 0 with 1 advisory (design-system-font-size: the 22px count, coin-stage.tsx:711, off the DESIGN.md ramp); --no-config 0; control 16 findings. detect.js on 10 views: "No anti-patterns found"; control 6. Headless, no overlay. No console errors, overflow, clipping; lowest contrast 4.80. Phone: every tap ≥44px, no overlaps. Measured: laptop "Every charge" at 874px in a 900px window; To file 1024 side panel scrolls 33px inside, never sticky; File menu (never-filed shop) scrolls in 427px box mid-screen at 1440, no repeats, focus in field; pick moves nothing, no floater overlaps, badge clears figures by 0.5px; phone Always line orphans "come"; shelves 6+6 at 820 and 200%, "Subscrip-tions" hyphenates at 820.

## Overall Impression

Up two; this round's fixes hold. Held back by the stage taking a laptop's first screen (a regression from the bigger pile and two-line figures), the empty-month "nothing to file", and the queue's top Undo. Biggest opportunity: desktop leads with the backlog like the phone.

## What's Working

1. Always and its line, the same words before you commit, everywhere.
2. Keyboard filing: three backlog rows in a row, focus moving on, the stage stepping months, the celebration at the end.
3. Failure handling: rollback, specific notice, Try again filed it.

## Priority Issues

1. [P2] The stage fills a laptop's first screen: charges at 874/774/754 in 900/800/768 windows; the 168px pile column sets the head's height (~100px empty under the figures). Fix: floor rises under the figures (pile overhangs the air above the right rolls), or shrink the pile with ≤3 stacks. Command: /impeccable layout.
2. [P2] Desktop opens on an empty month saying "nothing to file" beside "5 in other months". Fix: count stays the every-month total ("5 to file", "none in October" under it), or open on the newest month with loose coins. Command: /impeccable clarify.
3. [P2] Phone queue: Undo at the top for 6 s after a tile tap; grid jumps ~76px when the next coin brings a Last time tile. Fix: line with Undo just above the tiles; reserve the Last time tile's room. Command: /impeccable adapt.
4. [P2] Always default disagrees: queue stack off, stage stack and File all on (owner's decision). Fix if wanted: on when the shop has more than one loose charge. Command: /impeccable clarify.
5. [P3] Try again goes around the stage: no flight, gulp or celebration; focus left on the month heading. Fix: retry through the stage handle, focus back on the coin. Command: /impeccable harden.

## Persona Red Flags

Alex: no multi-select or suggestions pass; 12 roll stops; ⌘Z unsurfaced; filed charge's menu hides Split/Name below the scroll; menu widens 258→306 while typing.
Sam: focus on the month heading after a failure; year strip months only on hover/focus; window-level typing swallowed by browse mode; tile amounts' month implicit.
Casey: Undo at the top 6 s; tile grid jumps; /?cat=To file lands on Month with the backlog ~1,250px down under two "To file · 5" controls; "Money in" wraps; touch File menu 4px from the edge.
Owner (~2000): shop groups and File all right; one-offs cost Enter, letters, Enter; no sense of shops left; "Every charge" over the backlog; empty backlog ends on a muted line with "To file · 0" lit.

## Minor Observations

- Error notice wraps to 4 lines on desktop.
- Subscriptions "Show" + "Show all 13" list some twice.
- To file at 1440: the head is a mostly empty slab with Edit categories alone.
- Phone Always line orphans "come".
- 22px count off the type ramp: add it or use a ramp step.

## Questions to Consider

- What if desktop opened like the phone, on the backlog whenever anything waits?
- Could the pile keep its corner without setting the head's height?
- What would a "suggested filings" pass look like?
- Does To file mode need bars, or could the floor just shrink?
