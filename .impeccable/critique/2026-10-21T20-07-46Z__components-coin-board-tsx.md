---
target: the coin tray board as shipped (phone 390, desktop 1440, wide 1920; light and dark)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx"
target_fingerprint: "sha256:47bbcda8c33815660d2c48f4ab7e949d1f4057d273f6a6f504b0fd861040ac00"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/coin-board.tsx
timestamp: 2026-10-21T20-07-46Z
slug: components-coin-board-tsx
closed: true
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent). Local data: October is empty, so September was reviewed as the full month.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Gulp, notices and tab count work; a picked coin shows nothing on screen, and desktop never shows "all sorted" |
| 2 | Match System / Real World | 3 | Coins, loose change, Estonian figures fit; "roll" never appears on screen |
| 3 | User Control and Freedom | 3 | Undo everywhere (⌘Z), Escape puts a coin back; Undo lives 8s; the skip list is lost on reload |
| 4 | Consistency and Standards | 3 | Coherent; small drifts (theme toggle focus ring, year-strip limit colour, queue count type) |
| 5 | Error Prevention | 2 | Pile coins are anonymous: you file blind |
| 6 | Recognition Rather Than Recall | 2 | A coin's charge and a year bar's amount exist only for screen readers |
| 7 | Flexibility and Efficiency | 2 | No filing shortcuts or bulk filing; Always only in a passing notice |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained; 5-item figures line; the stage fills the first screen at 1440 |
| 9 | Error Recovery | 3 | Errors name the cause and offer a retry |
| 10 | Help and Documentation | 2 | "Tap its roll" is screen-reader-only; no cue that coins pick up or rows drag |
| **Total** | | **26/40** | **Acceptable (top of the band)** |

## Design Specificity Verdict

LLM: authored for this product. Rolls whose height is the money, dashed-jar limits with a deepened overspend cap, the "wow" face instead of a frown, the puzzled lost coin and "Where do I go?" belong to Kopikas alone. Generic: the ledger row and the Subscriptions/Pooleks cards. Missed chance: unfiled rows show a dashed grey chip instead of the coin.

Deterministic: CLI detect on 9 files, 0 findings (also with --no-config). Browser detector across 9 views (1440 light/dark, 390 phone Month and To file, 1920; October empty and September full): one finding, text-overflow on the phone ledger sub-line "Partner pays 1/2 · Card pay…" (components/coin-ledger.tsx:105). A control test confirmed detection works. Contrast scan clean in every view, but it never scans the chosen-roll state, where faded labels measure 1.7:1. No app console errors. Overlays ran headless only (no user-visible overlay).

## Overall Impression

The look is the strongest part; filing, which PRODUCT.md calls the product, is the weak link: the picked coin is anonymous, Always vanishes in 8 seconds, and finishing goes uncelebrated.

## What's Working

1. The picture never stands in for the number: each roll prints its amount and limit; bold marks overspend.
2. The phone queue is a clean single-task flow; every To file target is 44px or more.
3. Accessibility craft: skip link, progress-first narration, limit-aware labels, focus moves to the next coin, Muted on Oat Paper 4.8:1 / 7.1:1.

## Priority Issues

1. [P1] Loose coins are anonymous. The merchant, amount and day exist only in aria-label (coin-stage.tsx:315); "Tap the roll it goes in" only in the sr-only live line (coin-stage.tsx:552); no hover title. Fix: on pick, hover or focus, swap "2 to file" for a pill with merchant, amount and day and "Tap its roll" under it, in reserved space. Command: /impeccable clarify.
2. [P1] The phone Month tab breaks PRODUCT.md's 44px touch floor: no pointer-coarse sizing outside the header. Ledger category chips ~28px (the Month tab's filing path), month stepper 32px at the top, "Go to August" and "Show all 13" 20px, Accept and Stop tracking 36px, Money in and search 40px. Fix: the header links' pointer-coarse:min-h-11 treatment. Command: /impeccable adapt.
3. [P1] Filing a backlog is slow on phone and laptop. Always only in an 8s notice (toaster.tsx:37), overwritten by the next tap in the queue; nothing shows how many loose charges share the merchant; counters count what's left. On a laptop (1024–1899) the To file card is hidden (coin-board.tsx lg:hidden), the stage fills the first screen, drag only works while the roll is on screen (no autoscroll), the unfiled chip is the quietest. Fix: "11 more from X" with an Always toggle set before tapping; progress-first counts; a To file filter beside Money in; unfiled rows with the puzzled coin and an Ink "File…" chip. Command: /impeccable shape.
4. [P2] Choosing a roll fades the other rolls' names and amounts to 40% (1.7:1) (coin-stage.tsx:454, 686); the year strip's bars carry no figures. Fix: fade only the painted bodies; show the hovered bar's month and amount in the caption. Command: /impeccable polish.
5. [P2] The finish isn't rewarded: "All sorted" is screen-reader-only on desktop; "All filed" on the phone is a small panel. Fix: a one-shot confetti burst in clear air, rolls hopping with joy faces, "All sorted for September" under the pile; reduced motion keeps faces and words. Commands: /impeccable delight, /impeccable animate.

## Persona Red Flags

Alex: no key to file a focused row or picked coin; tabbing passes both coins, "Go to August", then 12 rolls; no multi-select; Always gone after 8s.
Sam: faded roll text 1.7–2.5:1; year-strip amounts hidden from zoom users; phone tabs are aria-pressed buttons, not a tablist; the pile shows at most 7 coins (coin 8+ only via the ledger).
Casey: Month tab targets under 44px (issue 2); the queue's "Other" tile sits under the tab bar; Skips lost on interruption.
Owner with ~2000 charges: one tap per charge, merchants interleaved, no "file all like this", counter shows only the remainder.
Partner: n/a (redirected to Pooleks).

## Minor Observations

- Detector: phone ledger sub-line "Partner pays 1/2 · Card pay…" cut 20px (coin-ledger.tsx:105).
- "Received +0,00 €" in green on an empty month; zero in Ink.
- "Today:" on the figures line reads as applying only to Everyday.
- Choosing a roll swaps the figures line for the year strip; the head grows ~50px and the floor jumps.
- Phone Month tab: three tall subscription alerts push "Every charge" ~2.5 screens down.
- "1842,16 €" beside "10 700,40 €" (correct Estonian formatting, looks uneven).
- Theme toggle focus is shadcn's grey ring, not the 2px Ink outline.
- Year-strip limit line in the wrapper colour, though its comment says it matches the rolls' Crayon Blue dashes (coin-year.tsx:99).
- DESIGN.md says the queue's "N to file" is a 20px Title; code sets 13px Muted (coin-queue.tsx:69).
- Dead Pooleks jar code in coin-stage.tsx (separate cleanup).
- The surface brief is stale (lists retired prototypes, the old "stage stays put" rule): reported, not fixed.
- Not bugs: blank full-page rows are content-visibility:auto; the Next dev badge overlaps the tab bar in dev only.

## Questions to Consider

- If a loose coin wore its merchant's icon instead of a puzzled face, would picking one become a decision rather than a lucky dip?
- Should the queue's unit be a merchant ("Coop · 214") rather than a charge?
- "Lead with progress" is a principle, so why does every counter count what's left?
- At 1440px, do 280px-tall rolls earn the whole first screen, or would the 200px floor plus a visible list help filing more?
