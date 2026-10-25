---
target: the coin tray board after failed saves, Last time, the laptop backlog, page order and filing by typing
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:220cf99e12d9b6826a1bc8684259d10993a1c999f3e290dbc6979c38a9194a88"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-25T14-10-04Z
slug: components-coin-board-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data: October (the current month) is empty, so September was reviewed as the full month. Views: phone 390×844 (queue, Month, backlog), 820×1180, 1024×768, 1250×800, 1440×900 light and dark, 1440 with To file on, 1470×830, 1920×1080, 720×450 at 2x (200% zoom); filing exercised (including with the server blocked, typing a roll's name, the menu's field, ⌘Z) and data restored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Optimistic changes and the stage's typed line are excellent; the menu field never shows Enter's target; an old phone error outlives a newer success |
| 2 | Match System / Real World | 3 | "Today: Everyday 1 842,16 €"; "Tap its roll" on desktop; "Drop a row on a roll" is mouse-only |
| 3 | User Control and Freedom | 3 | Undo everywhere (⌘Z verified), Escape drops the coin; a rule is gone to Settings after the 8 s notice |
| 4 | Consistency and Standards | 2 | Always on for a stack, off for the queue's stacked coin; "To file" names three things; the stage says what Enter does, the menu doesn't |
| 5 | Error Prevention | 2 | "s" then Enter files into Subscriptions and starts tracking; a stale Try again can re-file a charge decided since |
| 6 | Recognition Rather Than Recall | 3 | Last-time tag, usually-goes group and label pill help; type-to-file and ⌘Z undiscoverable |
| 7 | Flexibility and Efficiency | 3 | Every input files, backlog by shop; focus drops to body after a keyboard backlog filing; no multi-select across shops |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained stage; the same charges in two places; a 180px hole in To file |
| 9 | Error Recovery | 4 | Server blocked: coins put back, specific notice, Try again files once back |
| 10 | Help and Documentation | 2 | Good inline hints; rules and accelerators never explained |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

LLM: very specific: rolls on one scale, limit jars, overspend caps, sleepers for zero, puzzled coins that smile once picked, the Always line in the same words everywhere, the Estonian voice. The ledger rows and the Pooleks/Subscriptions cards are the generic parts, acceptable for reading.

Deterministic: CLI detect on 9 board files: exit 0, no findings (also --no-config); control files gave 13. TSX gets regex-only checks. In-page detect.js on 10 views: "No anti-patterns found"; a control page gave 7–8. Headless, no user-visible overlay. No console errors, overflow or contrast failures (lowest 4.80 green on oat, 4.83 muted on oat; dark 6.23). Phone: the stage coin 40px; Open Pooleks wraps into two 16px halves; "Show all 13"'s tap area overlaps the folded Subscriptions line by 2px. 1024: two rows cut "Card payment". File menu at 1440: scrolls in a 425px box when its row is mid-screen. To file at 1440: the side panel's wrapper equals the panel's height, so sticky never engages, and the grid leaves a 180px gap above Pooleks.

## Overall Impression

The review praises what was built: the honest stage, every input filing and agreeing, failures that never show an untruth. It holds at 28 because the newest features carry sharp edges (the menu's invisible Enter target and repeats, a stale Try again, the side panel stretching the grid) and the backlog lacks a keyboard loop. Biggest opportunity: make the laptop backlog a real filing loop.

## What's Working

1. The stage is the month's chart and the numbers stay printed; it wraps to shelves, never scrolls sideways.
2. Every input can file and they agree: keyboard pick hands focus to the right roll; typing "ho" shows "ho ↵" and says what Enter does; screen readers hear it.
3. Nothing shown is untrue: failures roll back with a specific message and a retry; the celebration waits for the server.

## Priority Issues

1. [P1] Focus drops to the page after filing from the backlog list by keyboard (1440, To file: Enter, "ho", Enter). The To file card moves focus on; the list doesn't. Fix: focus the next row's chip, or the list heading when empty. Command: /impeccable harden.
2. [P2] File menu traps: Enter's target invisible ("s" Enter files into Subscriptions, which starts tracking); usually-goes categories repeat in Every category (two ticks); ArrowDown from the field lands on Always; phone rows 39px. Fix: highlight the Enter target, rank matches by the shop's use, drop the repeats, 44px rows on touch. Command: /impeccable distill.
3. [P2] A stale Try again can undo a newer decision: the retry re-files the original charge for 10 s. Fix: close the notice once that charge has a category, or check its state before retrying. Command: /impeccable harden.
4. [P2] To file layout: the side panel sets its grid rows' height (180px gap above Pooleks with a short backlog, sticky never engages); at 820 the loose charges appear in the To file card and the backlog list. Fix: one column for list and cards with the panel sticky beside it; drop the card while To file is on. Command: /impeccable layout.
5. [P2] Always on for a stack but off for the queue's stacked coin (kept so by the owner's decision). Fix if wanted: on whenever the shop has other loose charges. Command: /impeccable clarify.

## Persona Red Flags

Alex: focus lost after keyboard backlog filing; type-to-file and ⌘Z invisible; ArrowDown to Always first; no multi-select across shops.
Sam: focus to body after backlog filing; phone menu rows 39px; the list's Show all 50×20 without a larger tap; "Drop a row on a roll" mouse-only; unconfirmed: a touch-opened menu focused its field in emulation (would raise the phone keyboard; check on a device).
Casey: error notice covers the queue's lower tiles and outlives a later success; Month opens on the empty current month; phone To file list ~1,300px down; coin label cuts the shop's name.
Owner with ~2000 charges: To file by shop is right; no next-row loop or cross-shop batch; the pile shows 7 stacks at most; a wrong rule undoable for 8 s only; 2000 rows untested.

## Minor Observations

- "Today: Everyday 1 842,16 €".
- Two Show all links with a roll chosen; Subscriptions has Show beside Show all 13.
- The year strip mostly empty with 3 months of data.
- 200% zoom: a large empty band above the second shelf.
- At 1440 the celebration plays at the pile, far from the tapped roll.
- Dark mode holds together.

## Questions to Consider

- In backlog mode, should the pile show the top shops instead of one month's coins?
- Should Always follow one rule everywhere, with the scope line as the safety net?
- Does the 640–1023 To file card still earn its place?
- Would a "next" loop give the desktop the phone queue's rhythm?
