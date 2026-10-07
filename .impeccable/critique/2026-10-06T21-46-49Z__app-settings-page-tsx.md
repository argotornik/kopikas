---
target: Settings
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/argo/Desktop/Claude Projects/expense-board/app/settings/page.tsx"
target_fingerprint: "sha256:022aa982ea5f96c99f9889f4fc8fa9d3761155d793af3ca92d4e7062b9c5d4c9"
target_path: /Users/argo/Desktop/Claude Projects/expense-board/app/settings/page.tsx
timestamp: 2026-10-06T21-46-49Z
slug: app-settings-page-tsx
closed: true
---
# Critique: Settings (`/settings`, app/settings/page.tsx)

Method: dual-agent (A: isolated design review · B: detector + browser overlay). 2026-10-07.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Status line reads props: after Save it still says "Token stored: never"; no health or expiry |
| 2 | Match System / Real World | 2 | Vercel, "05:00 UTC", GitHub Actions; sync result is raw JSON |
| 3 | User Control and Freedom | 1 | Forget rule is one click, no undo; Save overwrites a working token |
| 4 | Consistency and Standards | 2 | Old SettingsForm vs first-run ConnectForm; no PageHeader so no sign-out |
| 5 | Error Prevention | 1 | Any string replaces the token untested; 24×24 ✕ deletes instantly |
| 6 | Recognition Rather Than Recall | 2 | Raw bank patterns ("3902611") instead of merchant names |
| 7 | Flexibility and Efficiency | 1 | No filter/group over a growing rule list; Enter doesn't save the token |
| 8 | Aesthetic and Minimalist Design | 2 | Four identical cards; connection state is a 12px footnote; JSON dump |
| 9 | Error Recovery | 1 | "Saving failed — try again." with no reason; failed Save wipes the paste (:41) |
| 10 | Help and Documentation | 2 | Inline help exists; README referenced, not linked; nothing on revoking access |
| **Total** | | **16/40** | **Poor** |

## Design specificity
Mostly interchangeable admin panel; character survives in "taught"/"forget", the turning coin during sync, mono patterns, amber "matches nothing". Missed: merchant identity dropped; connection has no visible state.

Detector: overlay 5 — "Save" white on copper 4.1:1 (TP), "Sync now" disabled (FP), line length ~93/88 chars at 1024px (TP), Geist Mono 70% (detection).

## Priority issues
- [P1] Forget rule: one click, no confirm/undo, un-files history; focus drops to body; count overstates impact (raw substring, page.tsx:24). Fix: optimistic remove + 8s undo row restoring createdAt; count via categoryOf. → /impeccable harden
- [P1] Weak token flow can destroy a working connection: no pre-validation, failed Save wipes paste, stale status, JSON result. Fix: one Connection card on ConnectForm's phases, validate before replacing, one-line summary + Details, router.refresh(). → /impeccable clarify
- [P1] No connection health or expiry warning anywhere; failed syncs are discovered from stale numbers. Fix: Connected/Stale/Expired block, "stays alive until …", account list, amber board banner on failure. → /impeccable harden
- [P2] Rules unrecognisable and unscalable: favicon + name primary, pattern secondary, filter, group by category, section anchors. → /impeccable layout
- [P2] Shell and semantics: PageHeader (sign-out), h2 section titles, page title, <main>, 13–14px body copy. → /impeccable polish

## Persona red flags
- Jordan: no numbered steps; disabled Sync explained only by an impossible tooltip; "Token stored (encrypted)" under "Token stored: never"; success = `"ok": true`.
- Sam: one heading; disabled Sync skipped; Enter on any ✕ deletes and focus falls to body; sync result not live; faint ring/50 focus.
- Riley: access token accepted, works ~15 min then dies; network error on Save throws silently; double-click ✕ shows a false error.

## Minor observations
Only Smart-ID mentioned; "05:00 UTC" not local; muddy disabled copper; empty min-h-4 band; "taught 1 Sept" without year; "Shared by rule" vs "Pooleks"; rules can't be edited; no theme toggle.

## Questions
- Should rules be forgotten on the board, where they're taught, leaving Settings as the Connection page?
- Should forgetting play the filing cascade in reverse?
- Why does the strong connect flow live on a page you see once?
- No Disconnect and no pointer to revoking at LHV: trust decision or oversight?
