# Expense Board — personal finance webapp (plan)

A minimal, Bilance-like personal webapp for tracking costs and savings. Bank-familiar
transaction feed rendered as draggable tiles: drag to a category to categorize (and teach
a rule), drag onto "Anni" to 50/50-split it. Two users ever: Argo (everything) and Anni
(shared expenses + balance only). Replaces Splitwise for the couple's use case.

Status: specced AND core app built (2026-08-30) against mock data, on the work machine at
`~/Projects/expense-board` — copy that folder to the personal machine along with this file.

## Build state (what exists / what's left)

Built and verified locally (Next.js 16 + React 19 + TypeScript + Tailwind v4 + **shadcn/ui**
+ dnd-kit; local git repo, no remote; `.npmrc` with `min-release-age=3`):
- Board UI: day-grouped feed, stat cards, category rail, subscriptions panel, splits panel.
- All three drag targets working (drag→category prompt "Always/Only this one" verified in
  browser; share + subscribe handlers verified via API).
- Rules/overrides engine (override > newest matching rule), storage module with JSON dev
  adapter (`lib/storage.ts` — the file to swap for Neon Postgres).
- Subscriptions: drop-to-register, cadence inference, price-change + gone-quiet + next-due
  flags (Netflix 12.99→14.99 flag verified), monthly burn.
- Splits: 50/50 share flag, Anni quick-add at `/anni` (verified end-to-end), balance math,
  auto-settle suggestions from incoming Anni transfers.
- Lightyear snapshot editor dialog (append-only log).
- Seeded mock July+August 2026 data in `data/` (gitignored) — deleted/replaced by real
  LHV sync later.

Still to build (on the personal machine): LHV sync module + token settings page, Neon
adapter in `lib/storage.ts`, Clerk auth (gate `/` to Argo, `/anni` + quickadd to Anni —
`/api/action` is currently ungated dev-mode), Vercel project + cron, savings line chart,
first-run rule seeding from real merchant strings via the lhv.ai MCP probe.

---

## Data sources (verified facts)

### LHV — via lhv.ai (the only real integration)
- Official LHV service, open beta, free for LHV customers. Read-only.
- **MCP server:** `https://mcp.lhv.ai/mcp` (for Claude during development/probing)
- **REST API:** `https://api.lhv.ai/api/v1` (what the app uses)
  - `GET /accounts` — all accounts, IBANs, currencies, balances (`accounts:read`)
  - `GET /accounts/{iban}/statement?dateFrom&dateTo` — transactions + card
    reservations, optional balance snapshots (`transactions:read`)
- **Auth:** tokens issued at `https://api.lhv.ai/api-access` (Smart-ID / Mobile-ID / ID card).
  Access token ~1 h; refresh token 30 days. Token refresh: `POST https://auth.lhv.ai/oauth2/token`
  (refresh_token grant). Revocable anytime from LHV internet bank. Full audit logging on LHV side.
- **Not available:** any investment/portfolio data. Accounts, balances, transactions only.
- **To verify empirically in week 1:** whether refresh tokens rotate on use (design assumes
  they might — see token storage below).

### Lightyear — manual, no integration
- **No public API, no MCP** (verified Aug 2026; even portfolio trackers ingest Lightyear via
  statement-file export). Scraping ruled out (credentials risk, ToS, fragile).
- Argo manually enters: total value + holding percentages (remainder shown as cash, no
  nagging validation). Every edit is stored as a timestamped snapshot — **append, never
  overwrite** — including decreases. UI shows the value with an "as of {date}" label.

### Splitwise — deliberately ditched
- Its API exists, but the requirement is 2 people, 50/50 only, no groups, no ratios.
  Build the ~2% of Splitwise needed; it is the trivially easy 2%.

---

## Hosting & stack (decided)

Constraint: no always-on personal machine; current dev machine is a work laptop.
Hosted from day one.

| Piece | Choice | Notes |
|---|---|---|
| Platform | Vercel (Hobby tier) | Serverless; free; non-commercial use fits |
| Framework | Next.js (App Router) + TypeScript | Board is a client-side React app |
| Drag & drop | dnd-kit | Arbitrary drop zones + touch support (Anni is on a phone) |
| Database | Neon Postgres (Vercel Marketplace, free tier) | Replaces the original JSON-folder design |
| Auth | Clerk (free tier) | Two users; Anni role-scoped to the shared route |
| Sync schedule | Vercel Cron (daily on Hobby) + manual "sync now" button | Same endpoint |
| Charts | Hand-rolled SVG for the savings line | Chart.js only if charts multiply |
| Styling | Plain CSS | No Tailwind, no UI kit |

Deliberately NOT used: database servers, Docker, self-built auth, state-management
libraries, any always-on machine.

### Security / identity decisions
- **Personal accounts only**: personal GitHub, personal Vercel/Neon/Clerk, personal email.
  Nothing tied to work identity or hardware (offboarding-proof).
- **Bank-data-touching steps happen on a personal device only** (connecting the lhv.ai MCP,
  pasting tokens, probing real transactions). Code itself is not sensitive.
- **LHV tokens live encrypted in Postgres**, not in env vars (refresh tokens may rotate on
  use and env is read-only at runtime). Env holds only the encryption key.
- Monthly-ish re-auth is a known rhythm: when the refresh token expires, Smart-ID at
  api.lhv.ai/api-access → paste new token into a small settings page. ~60 seconds.
- Accepted trade-off (named): transaction history in Neon's cloud; mitigated by read-only
  scopes, LHV-side revocation, 30-day token self-expiry.
- Supply-chain hygiene at init: committed lockfile, `.npmrc` with `min-release-age`
  (multi-day cooldown on fresh releases), installs with `--ignore-scripts`.

---

## Data model

Precedence: **override > rule > uncategorized**. Rules apply at read time, so editing a
rule retroactively recategorizes history.

- **transactions** — immutable, as LHV returned them (id, date, amount, currency,
  counterparty, description, iban). Deduped by LHV transaction id. Multi-account from day one.
- **rules** — ordered `match (substring/regex on counterparty/description) → category`.
- **overrides** — per-transaction category exceptions (created by drags).
- **events** — append-only: `expense_shared` (transactionId or manual entry, paidBy,
  shared=true; 50/50 hardcoded), `settlement` (amount, date, matched transactionId),
  `snapshot` (Lightyear total, holdings %, timestamp).
- **subscriptions** — recurring-commitment registry: merchant pattern, expected amount,
  cadence (monthly/yearly, inferred from charge history where ≥2 charges exist, else
  monthly, editable), next due, active flag. Created by dragging a tile onto the
  Subscriptions zone (one drop = category rule + subscription record; no forms).
- Couple is hardcoded (Argo, Anni). No participants array, no ratio field. If life ever
  needs ratios, that's a small migration, not scaffolding to carry now.

**Balance** = ½·(shared paid by Argo) − ½·(shared paid by Anni) − settlements.

### Category semantics
- "Savings" (transfers to Lightyear / own savings) is a **transfer type, not an expense** —
  never counts toward monthly spend; shown in its own tile.
- Split expenses count toward "spent this month" at **Argo's share**, not the full charge.

### Savings tracking (the point of the app)
- **Saved this month** — sum of transfers to Lightyear/savings, automatic from the LHV feed
  (one rule matching the transfer counterparty). Accurate even if snapshots are neglected.
- **Portfolio value** — latest manual Lightyear snapshot (+ LHV savings balance from API).
- **Growth** — snapshot delta minus contributions, computed for free.

---

## UI (one screen + one shared route)

Main board (Argo only):
- **Header tiles:** LHV everyday, LHV savings, Lightyear (with "as of" date), spent this month.
- **Feed:** transactions grouped by day, bank-statement-familiar. Each tile: merchant,
  amount, category chip (or highlighted "uncategorized — drag me").
- **Right rail:** category drop zones with month totals; uncategorized bucket shown
  prominently (that visibility is the feedback loop that grows the rules).
- **Anni chip** as a second drop-target type. Same tile can be dragged to a category AND
  to Anni — split status and category are independent properties.
- **Subscriptions zone** as a third drop-target type. Dropping a tile registers a
  subscription seeded from the tile (merchant, amount, inferred cadence).
- **Subscriptions panel:** list with amount + cadence, headline "monthly burn" total
  (yearly normalized /12). Each sync auto-matches new charges to the registry and flags:
  price increase (charged ≠ expected), gone quiet (no charge for ~1.5× cadence — cancelled
  or payment failed; one tap marks inactive), and upcoming yearly renewals (next due).
- **Drop interaction:** dropping an uncategorized tile on a category asks
  "just this one, or always {merchant} → {category}?" → override vs. new rule.
  Re-dragging a categorized tile also offers to fix the rule.
- **Savings line chart** from snapshot history + LHV savings balances.

`/anni` route (Clerk-gated to her):
- Shows ONLY shared tiles + running balance ("you owe Argo €X"). Argo's private feed is
  not on this route at all.
- **Quick-add form** (~10 s) for shared things she paid — attributed to her, flips the
  balance the right way.

Auto-settle: her repayment transfer appears in Argo's LHV feed → rule matches her
name/IBAN → proposes a settlement event closing the balance.

---

## Build order

1. **Probe (personal device, zero code):** get LHV token at api.lhv.ai/api-access, connect
   the lhv.ai MCP to Claude, pull real transactions. Seed `rules` from actual merchant
   strings (~80% auto-categorization on day one). Confirm refresh-token rotation behavior.
2. Scaffold: Next.js + Neon + Clerk on personal Vercel; storage behind one module.
3. LHV sync endpoint (cron + button) + token settings page + encrypted token storage.
4. Board, read-only: feed, header tiles, category totals.
5. Drag-to-categorize with the override/rule prompt.
6. Subscriptions: drop zone, registry, sync-time matching + flags, monthly-burn panel.
7. Splits: Anni chip, events, balance tile, `/anni` route + quick-add.
8. Auto-settle matching.
9. Lightyear snapshot editor + savings chart.

Each step is independently useful if the next one stalls.

## Explicitly out of scope
- Portfolio/holdings tracking beyond the manual snapshot (no data source exists).
- Groups, friends, custom split ratios, debt simplification — 50/50 with Anni only.
- Anni's own bank feed / full-peer mode (expenses stay private; revisit only if she wants
  her own instance — the per-person attribution in events keeps that door open).
- Any always-on self-managed machine (VPS/Pi) — Vercel replaces it.
