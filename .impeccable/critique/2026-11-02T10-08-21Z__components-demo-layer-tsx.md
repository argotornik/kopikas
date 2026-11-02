---
target: components/demo-layer.tsx
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/.claude/worktrees/demo-board/components/demo-layer.tsx"
target_fingerprint: "sha256:7ddddf810d2e280d6c5781d08df002d2c4c5ebf0bda0037609bdfeaacb02d7a3"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/.claude/worktrees/demo-board/components/demo-layer.tsx
timestamp: 2026-11-02T10-08-21Z
slug: components-demo-layer-tsx
---
Method: dual-agent (A: design review agent · B: detector agent). Target: the public demo (NEXT_PUBLIC_KOPIKAS_DEMO=1, production build), 1440, 3440 and 390 widths. The user's two reported issues (Tip 1 ring, Pooleks tip over the charges) were fixed in e4276d0 before this run.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Tip 1 flashes back ~0.7s mid-hop on desktop; clicking Pooleks jumps straight to the end card |
| 2 | Match system / real world | 2 | First coin is "Pesumaja Puhas OÜ"; phone Month tip says "as tall as" for bars that lie flat |
| 3 | User control and freedom | 3 | Phone loses the only code link after closing the end card |
| 4 | Consistency and standards | 3 | "3 more filed themselves" vs "These 2, 2 more" vs "Filed 4"; tip numbers differ by device |
| 5 | Error prevention | 3 | Start over has no confirmation, ~30px from Tips on the phone |
| 6 | Recognition over recall | 3 | Phone tip 1 replaces "Where do I go?" |
| 7 | Flexibility and efficiency | 3 | Tip controls are tab stop 71 of 71 |
| 8 | Aesthetic and minimalist | 3 | First view carries accounts/Received/Your share; 7 of 12 rolls asleep |
| 9 | Error recovery | 3 | Undo in toast and queue line |
| 10 | Help and documentation | 3 | Phone tour never says what a coin is |
| **Total** | | **29/40** | **Good** |

## Design specificity
LLM: authored (crayon rings/arrows in the stage blue, advance on the real action); the end card is the one stock dialog moment.
Detector: CLI 1 advisory (17px off-scale, queue-tip.tsx:27). Browser: #4C6FE0 on Oat 3.8:1, a real fail on the 17px phone label, strict-only on the 22px/600 title (large text). Text-overflow on "15 to file" is a false positive from the 1.33 zoom. Pooleks and end card clean.

## Priority issues
- [P1] Phone tour never teaches the core action: QueueTipLabel replaces "Where do I go?" with "Try Always first"; ring stays on the switch after Always is on. Fix: keep the queue's prompt, say "This is a charge from the bank. Tap where it goes.", ring the tiles, teach Always on coin 2. /impeccable onboard (+ clarify)
- [P1] Pooleks step ends before Pooleks is seen (end card opens on arrival); on the phone the Pooleks tip covers the month heading and total. Fix: one tip on /pooleks ringing the balance, then the end card; compact form on the phone. /impeccable onboard
- [P2] Tip words pin to the viewport when the anchor scrolls away (layout() clamps y; layer is fixed). Fix: fade words when the anchor leaves, keep the step. /impeccable harden
- [P2] Peak filing flash and miscount: demo-layer.tsx:233 drop→pick on release while tips.filed arrives after the 0.7s hop; demo-browser.ts:71 subtracts ids.length (1 for a pile coin). /impeccable polish
- [P2] Tips hard to reach/hear: tab stop 71/71, freshly mounted role=status, phone label 3.8:1. Fix: one persistent aria-live region, "Skip tips" in the bar during the tour, label to 4.5:1 or 19px+. /impeccable audit

## Persona red flags
Jordan: opens mid-task on the phone; OÜ name is hard to place; "Now tap its roll" arrow points at empty floor between Transport and Mortgage; Mari first appears as "Split with Mari"; pitch only in the link preview.
Casey: "That's Always!" auto-advances when the 6s Undo line goes; tip 3 paper blocks Mortgage/Home/Health/Pets tiles; "10 to / go" wrap; no code link after Keep playing.
Sam: tips likely silent; pointer-only copy; controls last in tab order; ring has no spoken equivalent.

## Minor observations
Dark demo bar merges with the header; Always paper hides the celebrated rolls; year strip is 12 unlabeled blobs; "of 4" then a fifth tip; focused pile hides "11 to file"; red squiggle beside Tip 1; Edit categories and Investments lead away; the month is sparse on the 2nd.

## Questions to consider
End card lead with See the code, code link kept in the phone bar? A full past month (October) instead of the 2nd? Wolt/Bolt as the first coin?
