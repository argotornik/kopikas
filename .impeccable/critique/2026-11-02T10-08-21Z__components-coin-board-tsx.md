---
target: components/coin-board.tsx
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/.claude/worktrees/demo-board/components/coin-board.tsx"
target_fingerprint: "sha256:8a027d28f46da536cfdb363b929f236a8b6df76e29bdbd8cfbf78b2c349b3863"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/.claude/worktrees/demo-board/components/coin-board.tsx
timestamp: 2026-11-02T10-08-21Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review agent · B: detector agent). Target: the owner board at "/" (also /pooleks, /settings), 3440, 1440 and 390 widths, light and dark.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Undo lifetime invisible; ⌘Z silently no-ops after expiry |
| 2 | Match system / real world | 3 | "Go there", "Card payment" everywhere, "Investments" opens a form |
| 3 | User control and freedom | 2 | Undo dies with the notice (8s/6s); no Back to To file; forgetting an Always rule leaves the teaching charge filed |
| 4 | Consistency and standards | 3 | Floor list order vs menu/tile household order; "Go there" vs "Go to August" |
| 5 | Error prevention | 3 | Subscriptions with Always off still writes a rule |
| 6 | Recognition over recall | 3 | Drag barely hinted |
| 7 | Flexibility and efficiency | 3 | Stepper target moves; no ←/→ months; ⌘Z expires |
| 8 | Aesthetic and minimalist | 3 | "Card payment" noise; 750px gap on the ultrawide list |
| 9 | Error recovery | 3 | Silent ⌘Z is the gap (rest judged from code) |
| 10 | Help and documentation | 3 | Nowhere to learn ⌘Z, drag, typing |
| **Total** | | **29/40** | **Good** |

## Design specificity
LLM: highly specific (shared-scale rolls, sleepers, pile count as call to action, typed "sub" tag); generic at the charges list, cards and Settings.
Detector: CLI clean. Browser: text-overflow at coin-stage.tsx:742 is a zoom false positive. Real: /settings line length ~98-107 chars at settings-form.tsx:149 (max-w-[72ch]), rules-list.tsx:100 (max-w-[80ch]), share-rules-list.tsx:56. /pooleks clean.
Cognitive load: 2/8 fail (chunking, minimal choices), intrinsic to the task.

## Priority issues
- [P1] Undo has a hidden deadline and ⌘Z fails silently (toaster.tsx 8000ms, latestUndo cleared on close); no Back to To file; forgetting an Always rule leaves the teaching charge filed, contradicting rules-list.tsx:102. Fix: undo lives until the next change, "Nothing to undo" notice, Back to To file, unfile the teaching charge. /impeccable harden
- [P2] Month stepper Next moves (x=591/662/759/695) and the page jumps 7px when the scrollbar goes. Fix: fixed min-width or grouped chevrons; scrollbar-gutter: stable. /impeccable polish
- [P2] Choosing a roll moves the floor 12-17px (DESIGN says it shouldn't); year strip sparse and detached. Fix: reserve height; align bars or draw faint ticks. /impeccable polish
- [P2] No-partner path is a dead end: Pooleks link stays, "Partner" placeholder, no Split row, empty 784px cell at >=1900px. /impeccable onboard
- [P3] Always pill ends 4px from the panel edge; "Go there" names no month. /impeccable polish

## Persona red flags
Alex: Next chevron jumps up to 168px; ⌘Z expires; no ←/→ months; no cross-shop batch.
Sam: 8s Undo can't be extended (WCAG 2.2.1); "Go there" ambiguous; theme toggle exposes no state; every Settings card is a landmark.
Casey: inline Undo gone after 6s; Subscriptions tile under the tab bar at 844px; "Today:" line wraps with a dangling "·".

## Minor observations
"Card payment" subtitles; sticky stage taller than the ultrawide window slices "August"; stale Settings jump pill (16 vs 14); dark favicons vanish; notice wraps at 448px; dotted underline on Investments.

## Questions to consider
Undo owned by the last change, not a notice? Which order does the owner learn, position or name? What does a one-person household see where Pooleks is?
