---
target: First-run / sign-in
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/components/first-run.tsx"
target_fingerprint: "sha256:e821eb9f915cdd506b5e086cae9992e0914d390f1ee8e84c001c619425856576"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/components/first-run.tsx
timestamp: 2026-10-06T21-46-49Z
slug: components-first-run-tsx
closed: true
---
# Critique: First-run & sign-in (components/first-run.tsx, connect-form.tsx, setup-owner.tsx, app/sign-in)

Method: dual-agent (A: isolated design review · B: detector + browser overlay). 2026-10-07. FirstRun live on an empty store; Clerk, SetupOwner, NotOnBoard from code.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Phased status with row count; never says a sync can take up to 60s |
| 2 | Match System / Real World | 3 | Household voice, local ID methods; "refresh token"/"scopes" unexplained |
| 3 | User Control and Freedom | 2 | Network drop freezes the form; auth-off sign-in is a dead end |
| 4 | Consistency and Standards | 3 | Shared header and tokens; two wordmark sizes |
| 5 | Error Prevention | 2 | No token-type check; Enter handler ignores busy |
| 6 | Recognition Rather Than Recall | 3 | Steps beside the field; SetupOwner pre-fills the real email |
| 7 | Flexibility and Efficiency | 3 | Enter submits; one action stores, syncs, opens |
| 8 | Aesthetic and Minimalist Design | 3 | Focused; light mode grey-on-grey, input nearly invisible |
| 9 | Error Recovery | 1 | Every failure blamed on the token; useful hint buried; raw <pre> |
| 10 | Help and Documentation | 3 | Good steps and exact variable names; nothing after failure |
| **Total** | | **26/40** | **Acceptable** |

## Design specificity
Copy and motion authored (Smart-ID/Mobile-ID/ID-card, "Fetching the last 90 days from LHV…", coin as the only spinner, welcome cascade, deployment-aware routing). Composition is a generic paste-your-key column.

Detector: CLI 0 (first-run not rendered for overlay; Next 16 single dev-server lock). Sign-in overlay: muted text on background 4.1:1 ×2 (TP).

## Priority issues
- [P1] Failures misdiagnosed and the fix hidden: everything becomes "LHV did not accept the token." (connect-form.tsx:39), refreshGrant buried by the fallback error. Fix: classify network/session/LHV refused/LHV down, refreshGrant first, raw text behind a disclosure. → /impeccable harden
- [P1] Network drop freezes the form (no try/catch at :57, no timeout). Fix: try/catch, ~65s AbortController, "can take up to a minute" after 10s. → /impeccable harden
- [P1] Light mode illegible at the trust moment: muted 4.05:1, input border 1.09:1 (globals.css:67,83), failure text 2.51:1, Connect 4.08:1. Fix: card surface, darker muted and amber ink. → /impeccable polish
- [P2] Reassurance misplaced and incomplete; "Stored encrypted" untrue on the JSON adapter (storage.ts:415). Fix: can-see/cannot-do block before Connect, revoke pointer. → /impeccable clarify
- [P2] Wrong token type looks like success (access-token fallback, route.ts:57-65). Fix: warn when refreshGrant is set on success. → /impeccable harden

## Persona red flags
- Jordan: jargon unexplained; new-tab link unmarked; raw HTTP/JSON on failure; "Run the sync again" before any sync; "Ask Owner." with unset names.
- Sam: no landmarks; auth-off sign-in has no heading; failure <pre> outside the live region; focus lost when Connect disables; 32px controls.
- Riley: two tabs race on the rotating token; reload mid-sync shows a misleading state; zero transactions in 90 days = stuck on FirstRun with no route to Settings.

## Minor observations
Wordmark text-lg vs text-xl; double tagline on sign-in and "welcome back" on a first sign-in; Clerk may flash light before resolvedTheme; copper hex duplicated in clerk-themed.tsx:18; zero-rows outcome styled as failure.

## Questions
- Should the first screen show a ghosted board instead of a bare grey column?
- Should "can see / cannot do" come before asking for the token?
- If the first sync fails, should the owner land on an empty board with a sync-status banner?
