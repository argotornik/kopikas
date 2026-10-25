---
target: the coin tray board after the focus loop, guarded Try again, File menu, To file layout and touch-target work
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:c72333208251421bf6f9bd4702979144541f502f30c237155d00b36db182d7b6"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-25T17-36-17Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data runs July–September; September reviewed as the full month. Views: phone 390×844 (queue, Month, backlog), 820×1180, 1024×768, 1250×800, 1440×900 light and dark, 1470×830, 1920×1080, 720×450 at 2x; filing exercised (keyboard loop, menus, typing, server blocked, Try again) and data restored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Instant filings and clear progress; in To file the stage changes month on its own, unannounced |
| 2 | Match System / Real World | 3 | Plain copy; roll/loose change/Always learned; "Paid out" vs "spent" |
| 3 | User Control and Freedom | 3 | Undo everywhere; identical notices stack; menu ArrowUp from Always wraps to Name and icon, not the field |
| 4 | Consistency and Standards | 2 | Typing means different things on stage and menu; backlog mode draws the month twice; queue Always off vs shop row on |
| 5 | Error Prevention | 3 | Always states its scope; menu keeps Subscriptions last; the stage sends "s ↵" to Subscriptions |
| 6 | Recognition Rather Than Recall | 3 | Last-time tags, usually goes, ↵ tag; typing a roll's name and dragging stay invisible |
| 7 | Flexibility and Efficiency | 3 | Keyboard loop (chip, Enter, Enter, focus on); no multi-select, no jump to backlog |
| 8 | Aesthetic and Minimalist Design | 3 | Lovely stage; ~450px empty head around a 40px pile; dense figures line |
| 9 | Error Recovery | 4 | Rollback, named cause, guarded Try again |
| 10 | Help and Documentation | 2 | Microcopy only; Always and rules unexplained |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict

LLM: very specific (amount-height rolls on one scale, limit jars, deeper overspend, sleepers, puzzled coins, every number printed). Generic layer: the panels around the stage. 1920 strongest; laptop backlog mode weakest.

Deterministic: CLI detect on 9 board files exit 0 (also --no-config); control 6 findings. detect.js on 10 views: "No anti-patterns found"; control page 7. Headless, no overlay. No console errors, overflow, clipping; lowest contrast 4.80. Measured: phone Month pick shifts everything below 31px (Always caption wraps to 2 lines); lifted "2" badge 4.5px into the Savings/Investments line; 25 list chips 43.5px tap on phone; File menu for a never-filed shop scrolls in 425px box mid-screen at 1440 (no repeats, focus in field); To file gap 32px at 1440/1024, 820 card hidden; short backlog: panel ~196px past the cards, not sticky; 1024×768 panel scrolls 25px inside.

## Overall Impression

Up one point; this round's fixes held (focus loop, guarded Try again, lit Enter target, no repeats, 820 card, 44px phone targets). Held back by the stage and menu disagreeing on typing and by backlog mode's two drawings. Biggest opportunity: let the pile lead while coins wait.

## What's Working

1. The picture never bends the money: "236,46 € of 200 €" beside a roll deepened past its dashed limit; sleepers keep every place.
2. Always as error prevention: same switch and caption on stage, queue and menus.
3. Recovery and learning: rollback with Try again; the next menu lights "Home · once · last time ↵"; focus moves to the next chip.

## Priority Issues

1. [P1] Typing means different things on the stage and in the File menu: with Pesumaja picked, "s" on the stage → Subscriptions; in its menu → Shopping. Fix: one matcher (shop's used first, Subscriptions last) for stage, menu and queue; "also tracks it" on the stage line. Command: /impeccable harden.
2. [P2] Laptop backlog mode draws the month twice (floor + side panel, different looks and behaviour); short backlog leaves ~196px of panel past the cards, never in view. Fix: in To file shrink the stage to its head and let one set of rolls be target and growth, or a compact pinned floor. Command: /impeccable distill.
3. [P2] On the phone Always moves what you're about to tap: caption adds 2 lines (bars −31px on Month, tiles ~42px in the queue); lifted badge brushes Savings; queue Always off despite "and 4 more from here". Fix: reserve the caption lines or fold into progress; clear the badge. Command: /impeccable layout.
4. [P2] The pile is the quietest thing on the stage: 40px stack, "2 to file" in 13px grey, ~450px empty Oat Paper. Fix: pile and count lead while coins wait; total takes over once sorted. Command: /impeccable bolder.
5. [P3] Figures line mixes this month and today's balances in 13px grey. Fix: two labelled lines. Command: /impeccable typeset.

## Persona Red Flags

Alex: no multi-select or jump to backlog; identical stacked notices; stage changes month on its own; pile shows first coins only.
Sam: menu ArrowUp from Always wraps to Name and icon; skip links 1px browser ring; headings read their side text; backlog month changes unannounced; 12 roll buttons before the list.
Casey: Always caption shifts tiles/bars; Other and Savings tiles below the fold; badge touches a figure; skipped coins lost on reload; chips 43.5px.
Owner (~2000 charges): shop groups right; phone queue one charge at a time with Always off; side panel jumps to each shop's newest month; no filter within To file.

## Minor Observations

- 820 floor wraps 10 + 2.
- Low-row File menu scrolls and hides Split/Name and icon; could open upward.
- Dark mode: some logos (Delice) nearly vanish.
- Repeated filings could merge into one notice.
- Year strip: 8 empty bars with 3 months of data (local data).

## Questions to Consider

- If filing is the product, why is the pile the quietest thing on the stage?
- Does backlog mode need two drawings of the month, when 1920 shows one is enough?
- Should typing a category be one engine everywhere?
- Should the phone queue ask about the shop rather than the charge?
