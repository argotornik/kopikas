---
target: the coin tray (/coins)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/app/coins/page.tsx"
target_fingerprint: "sha256:abe5118c965e0ac3a6b9bbfbc5bb3a1c7d14f67f018bdf6fafeb40fdf62099a0"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/app/coins/page.tsx
timestamp: 2026-10-07T19-35-08Z
slug: app-coins-page-tsx
---
Method: dual-agent (A: a51dc7b4f4653e3c4 · B: a7ab538b6709c8563)

# Critique: the coin tray (/coins)

## Design health score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 2 | Desktop stage confirms richly; phone queue filing happens off-screen (coin flies ~630 px above the viewport); bubble flips to a stale "Hi! 2 coins to sort" mid-hop |
| 2 | Match system / real world | 3 | Coin/roll metaphor and Estonian formatting land; small amounts all draw at the same roll height; "Every charge" lists income |
| 3 | User control and freedom | 2 | "Put it back" and Escape before landing; no undo after, and no way to refile a mistake |
| 4 | Consistency and standards | 2 | Two filing grammars with different targets (rolls with spend vs all 13 in the select); "sort" vs "file"; old-board theme toggle |
| 5 | Error prevention | 2 | Rolls disabled until a coin is picked; coins show no amount (two Pesumaja coins look identical); a select changed mid-hop is silently ignored (coins-prototype.tsx:626) |
| 6 | Recognition rather than recall | 2 | Pick a coin to learn what it is, and then only the merchant; categories with no spend this month are absent from the stage |
| 7 | Flexibility and efficiency | 1 | No Always, batch, search or shortcuts; each 0.7 s hop blocks the next filing; focus jumps to the top after filing |
| 8 | Aesthetic and minimalist design | 3 | Focused, charming stage with clear numbers; dead band under the total, seven prototype controls above the month, generic lower half |
| 9 | Error recovery | 1 | The one failure path fails silently; misfiles can't be fixed; no failure states designed |
| 10 | Help and documentation | 2 | Kopikas's tips are on-voice and contextual, but behind a click and gone after 4.5 s |
| **Total** | | **20/40** | **Acceptable** (bottom of band) |

## Design specificity

Review: the stage is authored, not interchangeable: one floor of wrapper-coloured roll characters, the loose-change pile with its count, the total as hero, Kopikas narrating in progress-first copy that never shames, and the pick, hop, gulp gesture. Below the stage it collapses: "Every charge" is the old ledger in a beige panel (category as a 10 px dot; rows hover but do nothing) and "To file" is white cards with a 13-option select, no coins or characters. The build has also drifted from the contract's OWN-WORLD ("clean white ground, bright saturated wrappers") to a beige panel and a muted picture-book palette; the contract no longer describes the build.

Scan: CLI clean (0 findings, 7 files). In the page, 2 real findings agreeing with the review: low-contrast income green "+120,00 €" 3.7:1 on #EFEBE3 (coins-prototype.tsx:1074; the panel colour is runtime-only, so the CLI can't see it); first-viewport-column-overflow at :972 (the to-file rail ends after 362 px, not sticky, ~1,600 px of empty column beside the 1,985 px ledger). Three more findings appeared only at a 0-width hidden-pane layout: false positives. No findings on the drawn characters. Overlays left in the [Human] tab of the in-app browser.

## Overall impression

The stage earns the redesign; everything around it is still the old board in new colours. The biggest opportunity: make filing itself live in the world, on the phone, below the stage, and after a coin lands.

## What's working

1. The stage tells the month's story as one picture: one floor, a wrapper per category, the total as hero, progress-led copy, decoration clear of every number.
2. Pick-then-tap is accessible by construction: real buttons with full labels, rolls disabled until a coin is picked, Escape puts it back, filing announced to screen readers, queue filing moves focus to the next row.
3. On a phone every amount stays as text (bars with name and amount); the drawing never carries a number alone.

## Priority issues

1. [P0] Keyboard focus is invisible on every custom control. FOCUS (coins-prototype.tsx:56-57) pairs outline-none with focus-visible:outline-2; in Tailwind v4 outline-none sets the variable outline-2 reads, so the focused outline is none (verified on coins, rolls, selects, stepper, Kopikas, nav). Fix: outline-hidden or focus-visible:outline-solid; a world-native roll focus (lift + ring); return focus to the next coin after filing. Command: /impeccable harden
2. [P1] Roll heights lie for small amounts. A 44 px body floor (painted.tsx:138; 34 px bars at :221) draws 6 of September's 8 rolls (3,35 € to 48,30 €) at one height. Breaks "never blur a number" and "one shared scale". Fix: true-height body, the face on a lid above it. Command: /impeccable shape
3. [P1] On a phone the queue is buried and filing gives no visible feedback. Queue starts at 1,017 px on an 812 px screen; queue filing fires hop, gulp, Kopikas and the "All sorted" burst off-screen; targets under 44 px (select 40, coins 40, stepper 32, look toggle 20). Fix: on a phone the queue is the stage (one coin at a time, rolls as thumb-zone targets, Kopikas inline); at minimum "Filed under Home · Undo" in the row. Command: /impeccable adapt
4. [P1] Filing is weaker than on the board it would replace, and the lower half isn't in the world. No Always, no undo after landing, no batch (Pesumaja four times); ledger rows can't be refiled; the stage only offers categories with spend (:448-450), so Mortgage, Health, Shopping, Cash, Savings are queue-only; the ledger and queue are old-world (and the half-empty rail). Fix: "Always put Pesumaja in Home?" + Undo in the bubble; empty rolls for zero-spend categories; ledger rows as coins you can pick up again; the queue in the world. Command: /impeccable shape
5. [P1] The stage doesn't fit a real household's categories. Fixed 84 px rolls + 20 px gaps fit ~8 at 1440; "Other" clipped at 1100; half the rolls in an unmarked scroller at 768; the household has 13. Fix: roll width from the count on a fluid grid, two-line names, a rule for 12+. Command: /impeccable layout

## Persona red flags

- Alex: four Pesumaja charges, four pick-and-tap cycles; 0.7 s hop blocks; focus back at the top after filing (~9 Tabs to the next coin); a select changed mid-hop silently does nothing.
- Sam: focus invisible and lost after stage filing; never hears where the coin went; hears a stale "Hi! 1 coin to sort" mid-flight; bubble read twice; over-limit pink fill 1.67:1; income 3.7:1; tips vanish after 4.5 s.
- Casey: queue more than a screen down; targets under 44 px; no visible reward, even for the last coin; "Go to August" changes the month out of view; a 13-item picker per charge.

## Minor observations

- The empty pile's placeholder coin reads as "one left" exactly when nothing is.
- Coins are one size and show no amount.
- "Tap the roll Pesumaja Puhas OÜ goes in." is hard to parse and says "Tap" on desktop; "sort" vs PRODUCT's "file".
- Shopping's grey wrapper reads as disabled; lime 1.13:1 and sky 1.44:1 barely separate from the panel; wrapper colours differ between painted and goofy.
- Roll order shifts month to month; filing into a category with no roll inserts one and shifts the row; the hop uses fixed coordinates, so scrolling mid-hop misaims it.
- Dead band under the total on desktop; Kopikas small for the lead at 112 px.

## Questions to consider

1. If the phone's job is the queue, why does the phone open on a chart?
2. What does a roll look like at 3,35 €? Should the face ride on a lid above a true-height body?
3. Where does Always live in this world? "Shall I always put Pesumaja in Home?"
4. Should every ledger row be a coin you can pick up again?
