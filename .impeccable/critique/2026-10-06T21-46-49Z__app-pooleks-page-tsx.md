---
target: Pooleks
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/app/pooleks/page.tsx"
target_fingerprint: "sha256:f00a42b7a22e19ed2e1bb24c31d0b4b09617bfa9879352e2c1b12c4000dc246c"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/app/pooleks/page.tsx
timestamp: 2026-10-06T21-46-49Z
slug: app-pooleks-page-tsx
closed: true
---
# Critique: Pooleks (`/pooleks`, components/pooleks.tsx)

Method: dual-agent (A: isolated design review · B: detector + browser overlay). 2026-10-07. Owner view live; partner view from code.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Roll-to-zero and fold slide-in excellent; Add/Record show no pending state; Settle closes before the POST |
| 2 | Match System / Real World | 3 | Fluent headline; signed figures make double negatives ("Partner owes −12,45 €") |
| 3 | User Control and Freedom | 1 | Settlements can't be deleted (no API action); Remove is one click; partner can't fix own entries |
| 4 | Consistency and Standards | 2 | Dot-decimal inputs vs comma display; two dialogs built differently; sign meaning flips per viewer |
| 5 | Error Prevention | 1 | 20×20 Remove, no confirm; Record doesn't restate the amount; no double-submit guard |
| 6 | Recognition Rather Than Recall | 2 | Sign meaning only in a 10px header; running column unlabelled on phones |
| 7 | Flexibility and Efficiency | 2 | Details remembered, settle prefilled; dialogs aren't forms |
| 8 | Aesthetic and Minimalist Design | 3 | Clean default; Details category row is busy |
| 9 | Error Recovery | 1 | err renders only in the Add dialog (:517); failed fetch crashes (:130 → :302) |
| 10 | Help and Documentation | 2 | Partner's empty state gives owner instructions (:326) |
| **Total** | | **19/40** | **Poor** |

## Design specificity
Statement core is authored: ruled rows, the fold ("Settled up to 31 Aug · 7 lines · −3,15 € carried"), roll-to-zero then "All square", ledger copy. Balance card and dialogs are generic. Missed: no merchant favicons; purple barely used on the page about sharing; Bricolage at 12px; own header instead of PageHeader.

Detector: overlay 3 — "Add expense" white on copper 4.1:1 (TP), 10px column header (:332, TP), Geist 74% (detection).

## Priority issues
- [P1] Settle up can't be undone, isn't confirmed, has no author: Record closes before the POST (:563), failure invisible, "40,40 €" silently ignored (:556), no delete exists. Fix: sentence dialog with comma amount, remaining balance, "Record 40,40 € repayment", pending + undo, "recorded by". → /impeccable harden
- [P1] "Partner pays" header mislabels partner-paid rows (figure is the owner's part, :172); negative running balances. Fix: positive amounts with direction words/arrows relative to viewer. → /impeccable clarify
- [P1] Remove is one tap with no undo (20×20, always visible on touch, 11 of 17 tab stops). → /impeccable harden
- [P1] Errors land in the wrong place or crash the page. Fix: page-level aria-live alert, guarded fetch, same-width skeleton. → /impeccable harden
- [P2] Partner experience written from the owner's side (empty state, "You pay 1/3", no Cancel on Add, can't remove own entries). → /impeccable onboard, /impeccable clarify

## Persona red flags
- Jordan (the partner): owner instructions in empty state; 10px sign explanation; ambiguous "You pay 1/3"; Settle doesn't say it records money already sent; eye icon suggests privacy.
- Sam: div grid not a table; month labels not headings; headline not live; split chips colour-only; focus not returned to Settle up; settle amount unlabelled.
- Casey: Remove 20×20, chips 40×22; "Partner paid" truncated at 375px; running column unlabelled on phones; keyboard can cover split chips.

## Minor observations
`today` via toISOString is UTC (:154); "11 shared · 1 repayment" counts all time while 5 lines are open; backdrop blur hides the statement while choosing an amount; "← board" lowercase.

## Questions
- Should a repayment be a handshake — one records, the other confirms?
- Could Settle up come from the partner's actual LHV transfer (settle already accepts txId)?
- If every row said in words which way it moved the tab, would anyone need signs or Details?
