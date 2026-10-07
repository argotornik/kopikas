# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Today, one household in Estonia. The owner connects LHV, files every transaction, and keeps the categories, rules and subscriptions, mostly on a big screen; on the phone they work through the backlog of charges still to file. The partner signs in to Pooleks only: the shared statement, adding what they paid for, recording repayments.

Intended: other households in Estonia that bank with LHV, of any size: someone living alone, a couple, flatmates. The redesign treats a stranger's path as real (signing in, connecting LHV, an empty board, no household's names baked in). Separate accounts for many households on the server are a later project.

## Product Purpose

A money board fed by the household's own bank data. Every transaction arrives as one statement, and the owner files them into categories by a gesture; choosing Always writes a rule that files every past and future charge from that merchant. A second statement, Pooleks, keeps who owes whom for shared costs.

It exists because bank apps show one transaction at a time on a phone and never the month at once, and because shared costs kept in Splitwise had to be typed twice. Most people avoid looking at their bank account to see what they spend; Kopikas sets out to make that look a positive experience, something a household opens because it feels good, not a reckoning. Success: the month is understood at a glance, a backlog of two thousand transactions sorts itself in an afternoon, shared costs settle without anything typed by hand, and checking the money is something people do willingly.

## Positioning

- The bank is the source. Transactions come from the LHV API, so the ledger is complete and the shared statement needs no data entry.
- Filing is physical: drop a charge on a category, choose Always, and the merchant's other charges file themselves.
- The whole month as one ledger on a big screen; the phone's job is filing the backlog.

## Operating Context

- LHV's read-only API (in beta): the user gets a refresh token at api.lhv.ai/api-access with Smart-ID, Mobile-ID or ID-card and pastes it into Settings. The token rotates on every use and stays alive while a sync runs at least every 30 days. Sync runs hourly (GitHub Actions) with a daily Vercel cron as the backstop.
- LHV investments are read from the API; the Lightyear pot has no API and is entered by hand.
- Amounts are euros in Estonian formatting: comma decimals, space thousands (10 700,40 €).
- The owner works on a desktop for the overview and drag-filing, on the phone for the to-file queue; the partner mostly opens Pooleks.
- Self-deployable today: MIT licensed, one Vercel + Neon + Clerk deployment per household.

## Capabilities and Constraints

Built:

- Ledger: merchant names, favicons or emoji instead of the bank's strings; grouped by day; search; the view lives in the URL.
- Categories: rename, add, reorder (not delete yet); monthly limits; a twelve-month strip; Paid out and Received per month.
- Rules: a lowercase substring matched against counterparty and description; listed in Settings grouped by category.
- Subscriptions: monthly and yearly tracking, next due date, price changes to accept, "gone quiet".
- Pooleks: splits of 1/2, 1/3 or 1/4 between two people, Always for a merchant's future charges, Settle up, repayments either person can remove and which say who recorded them, history folded before the latest repayment.
- Undo for one-click changes (also ⌘Z / Ctrl+Z); failures say what went wrong.
- Filing by mouse (drag), keyboard (the File menu) and touch (the to-file queue and a sheet of categories).
- Stat tiles: your share of the month, account balances with a 30-day line, investments over time.

Constraints:

- Only LHV is supported. Another bank means implementing its two fetch functions.
- Two sign-in roles (owner, partner) and the two investment pots are hard-coded to one household and set through environment variables.
- Stack: Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui on Base UI, dnd-kit, Motion, recharts, Clerk; Postgres on Neon in production, JSON files with mock data locally.

Open decisions:

- Separate accounts for many households (data isolation, invites, roles): a project after the redesign.
- Households of any size: more than two members and n-way splitting are not built; how Pooleks generalises is undecided.
- What someone living alone sees in place of Pooleks.

Terminology: *file* (categorise), *Always* (write a rule), *to file*, *Paid out*, *Received*, *Your share*, *Pooleks* (Estonian "in half", the shared statement), *Settle up*, *repayment*.

## Brand Commitments

The current identity, which the user leans toward keeping but holds open: a redesign may argue for changing any of it, and the user decides.

- The name Kopikas and its Estonian voice: *iga kopikas loeb* (every penny counts), Pooleks, plain-spoken English copy.
- The coin mark: a copper disc with a lowercase k struck into it (`app/icon.svg`, `components/coin-mark.tsx`).
- Copper as the colour.

References the user named (2026-10-07), for what they do rather than as templates: bklit.com for chart craft; kokonutui.com and reactbits.dev for motion, animated backgrounds and effects; family.co for fun (its characters, bright friendly colour, little interactions, soft bold type); freefaces.gallery/display as a source of display faces.

## Evidence on Hand

- Mock data the JSON adapter seeds into `data/` (invented merchants and amounts); README images in `docs/` show the current look as of 2026-10-07.
- Critique snapshots from 2026-10-07 in `.impeccable/critique/`.
- One household uses it. There are no other users, testimonials or usage figures, and none may be invented.

## Product Principles

1. Looking at the money should be fun. Playful and cute all the way, at the craft level of Family: characters, bright colour, small springy interactions, friendly type. Lead with progress, reward filing, never shame, and never let the fun hide or blur a number.
2. Filing is the product. Every screen serves turning bank lines into understood money, and every input (mouse, keyboard, touch) can file.
3. Nothing typed twice. The bank is the source; hand entry only where no API exists.
4. Say what happened. Failures name the cause and the way out, one-click changes can be undone, nothing fails silently.
5. A household, not an account. It works for one person, a couple or flatmates, with no one's names baked in.

## Accessibility & Inclusion

What exists and is the floor: text at 4.5:1 contrast in both themes, filing by keyboard, announcements for screen readers during a drag, reduced motion honoured, 44px touch targets on touch screens.
