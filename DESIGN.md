---
name: Kopikas
description: A household money board drawn as a picture book, where every charge is a coin and the numbers never fudge.
colors:
  page-white: "#FFFFFF"
  night: "#0F1015"
  oat-paper: "#EFEBE3"
  oat-paper-night: "#1F1D22"
  mist: "#F4F5F7"
  mist-night: "#191B22"
  card-night: "#23252E"
  card-oat-night: "#2A282E"
  mist-oat-night: "#1A181D"
  ink: "#16171C"
  chalk: "#F3F2EE"
  muted: "#63666F"
  muted-night: "#A7A9B4"
  copper: "#CB793E"
  copper-edge: "#A45A2B"
  copper-ring: "#E39C63"
  copper-k: "#7C3F1D"
  brass: "#E3B341"
  nickel: "#BDBDBD"
  crayon-blue: "#4C6FE0"
  face-navy: "#2E3A8C"
  face-cream: "#F6F2EA"
  limb-brown: "#3A2A20"
  limb-sand: "#D9C7B4"
  tongue-pink: "#F07A8C"
  received-green: "#0A763F"
  received-green-night: "#4FD18B"
  sun: "#FFB020"
  sun-ink: "#B07A12"
  stamp-red: "#B8233F"
  stamp-red-night: "#FF7A8A"
  wrapper-cornflower: "#6C8EEA"
  wrapper-tomato: "#E2553B"
  wrapper-pink: "#F0A3B4"
  wrapper-grass: "#3F9A55"
  wrapper-brown: "#6B4630"
  wrapper-sky: "#A9C8F5"
  wrapper-lime: "#D9E85A"
  wrapper-lavender: "#8C6BD9"
  wrapper-yolk: "#F2C14E"
  wrapper-grey: "#B8B8B8"
  wrapper-brick: "#C7432F"
  wrapper-mint: "#8FCB9B"
  wrapper-apricot: "#E8A15C"
  wrapper-teal: "#2E9E9A"
typography:
  display:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
  title:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
  wordmark:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.25
  display-phone:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "\"tnum\" 1"
  headline-phone:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1
  small-head:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
  field:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.375
  caption:
    fontFamily: "Rubik, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.25
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  card: "16px"
  roll: "22px"
  stage: "28px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  page: "20px"
  xl: "24px"
  2xl: "32px"
components:
  stage-panel:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stage}"
    padding: "32px 32px 24px"
  card:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  pill-toggle:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  pill-toggle-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  nav-link-hover:
    backgroundColor: "{colors.mist}"
  select-pill:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 36px 0 16px"
  category-chip:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  roll:
    backgroundColor: "{colors.wrapper-cornflower}"
    rounded: "{rounded.roll}"
    width: "84px"
---

# Design System: Kopikas

## Overview

**Creative North Star: "The Picture-Book Ledger"**

Kopikas is a household's statement drawn as a picture book. Every page is painted in the manner of KAIA (@saiakuubik), credited in the README: flat matte shapes with gently uneven edges, round characters with faces of two dots and a curve, a white page with a warm Oat Paper stage. Underneath the storybook is a ledger, and the ledger never fudges: amounts are always text in tabular figures, and a drawing may decorate a number but never stand in for it or bend it.

The mood is warm, playful and tidy. Warm comes from Oat Paper, copper and the painted wrapper colours. Playful comes from the cast, the coin rolls and the loose coins, who blink, gulp and hop; every step is still said in plain, progress-first words for screen readers. Tidy is the point of the product: filing a coin into its roll is a small satisfying act, and the layout stays orderly so the fun never gets in the way of reading the month. Density is relaxed on the stage and plain in the lists.

The board at `/` is the coin tray: every charge is a coin, every category a roll with a face, the month a row of rolls on one shared scale. It replaced the older board and its finance-dashboard vocabulary of stat cards, sparklines and grey cards on 2026-10-17, and refuses the cold bank register. Every screen around it wears the same look, from the first run to sign-in and the page for a wrong address, and the whole app is set in Rubik and Fredoka. A goofy alternative look (googly eyes, tongues, a boiling line) was judged too goofy and retired with its prototype on 2026-10-19; only its boiling line lives on, in Kopikas.

**Key Characteristics:**
- Painted characters with vector-smooth, gently wobbled edges; faces of two dots and a curve.
- A white page, an Oat Paper stage, and bright-but-matte wrapper colours, one per category.
- Fredoka for the voice (wordmark, month, total, section heads), Rubik for everything that is read.
- Flat paper cut-outs: depth only from the oval each character stands on.
- Springy, small motion that rewards filing, and that keeps every state when motion is reduced.

## Colors

A white page, a warm oat stage, copper as the house colour, Crayon Blue for every painted face, and thirteen matte wrapper colours that each belong to one category.

### Primary
- **Kopikas Copper** (copper): the house colour, carried by the coin: Kopikas's body, the wordmark coin, the loose coins in the pile. Its darker **Copper Edge** shows the coin's turned rim, **Copper Ring** the struck ring, and **Copper K** the embossed k. Coins also come in **Brass** and **Nickel**, so a pile reads as loose change rather than one colour repeated.

### Secondary
- **Crayon Blue** (crayon-blue): the ink of every painted face, Kopikas's eyes and mouth, and every limit line. On a light wrapper a face is drawn in **Face Navy**, on a dark one in **Face Cream**, so it always reads on its own roll.

### Tertiary
- **The wrappers** (wrapper-cornflower, -tomato, -pink, -grass, -brown, -sky, -lime, -lavender, -yolk, -grey, -brick, -mint, -apricot, -teal): one per category, in that order, by the category's place in the list; a fifteenth category starts the list again. They are the brightest things on the page and the only large areas of colour; everything around them stays neutral so the month's shape reads first.

### Neutral
- **Page White** (page-white) and **Night** (night): the page ground in light and dark. Cards sit on Page White (card-night in dark).
- **Card on Oat Night** (card-oat-night) and **Mist on Oat Night** (mist-oat-night): in dark, what sits on an Oat Paper panel or dialog turns warm, cards a step above Oat Paper Night and quiet fills a step below, so the panel and everything on it read as one material where the blue-greys would read as a second. Cards on the page itself keep card-night and mist-night, cool on Night.
- **Oat Paper** (oat-paper) and **Oat Paper Night** (oat-paper-night): the stage and the panels below it, where the characters live.
- **Mist** (mist) and **Mist Night** (mist-night): quiet fills for inputs, hover backgrounds and the plain panel.
- **Ink** (ink) and **Chalk** (chalk): all text and the active pill, in light and dark. Ink on Oat Paper is 15:1.
- **Muted** (muted) and **Muted Night** (muted-night): secondary text and captions; 4.8:1 on Oat Paper, 7.1:1 on Oat Paper Night.
- **Limb Brown** (limb-brown) and **Limb Sand** (limb-sand): the characters' arms, legs and dark marks, swapped by theme so feet and confetti never vanish on the night ground.
- **Received Green** (received-green / received-green-night): money coming in. 4.8:1 on Oat Paper, 5.7:1 on white and 5.2:1 on Mist; the night value is 8.6:1 on Oat Paper Night.
- **Sun Yellow** (sun) and **Sun Ink** (sun-ink): what needs dealing with, such as a late sync or a failed connection: a dot, a tint behind the words, or Sun Ink for an icon on a light ground. It is not for errors.
- **Stamp Red** (stamp-red / stamp-red-night): what you just did didn't go through: a field that didn't take, a request that failed, a sync that LHV refused. It colours the alert icon and the field's edge; the words beside them stay Ink, except an editor's one-line hint, which may be red itself. A crimson, away from the orange-red wrappers (Cash's brick, Eating out's tomato): 6.3:1 on white and 5.3:1 on Oat Paper, the night value 6.7:1 on Oat Paper Night.

In code these are Tailwind colours in `app/globals.css` under the same names, shortened where long (`oat` is Oat Paper, `received` is Received Green, `muted-text` is Muted, since shadcn's `muted` is a fill). Each theme has its own token and a class names both: `bg-oat dark:bg-oat-night`. Components never write the warm night greys: inside anything wearing `dark:bg-oat-night`, and inside the dialogs, one rule points card-night and mist-night (and shadcn's card, secondary, muted and accent) at them, so a card on a panel is `bg-white dark:bg-card-night` like any other. shadcn's parts read the same colours through its variables. The painted cast keeps its palette in `painted.tsx`.

### Named Rules
**The One Wrapper Rule.** A category owns one wrapper colour, given by its place in the list, everywhere it appears. Never pick a wrapper for looks.

**The Oat Paper Rule.** Oat Paper is where characters live: the stage and its sibling panels. The page itself stays Page White, so the stage reads as a place.

**The Face Is Decoration Rule.** Crayon Blue on copper is 1.4:1. A face may show a mood but never carries meaning on its own; every state it shows is also said in words.

**The One Crayon Rule.** Every face is drawn with the same ink, Face Navy or Face Cream by the wrapper's lightness, never a colour of its own: one hand drew the whole cast. Per-category face inks were tried (2026-10-08) and rejected: a dark ink of another hue is invisible at face size, and a tinted one fails contrast on its own wrapper.

## Typography

**Display Font:** Fredoka (with ui-rounded, system-ui, sans-serif)
**Body Font:** Rubik (with system-ui, sans-serif)
**Code Font:** the system monospace (ui-monospace, SF Mono, Menlo), as `font-mono`: only for something typed exactly as shown, such as a variable's name on the setup screen.

**Character:** Fredoka is round, soft and bold: the friendly voice of the book. Rubik is a calm, slightly rounded sans for everything that is read and compared. Fredoka is provisional: the display face may still change to one chosen from Free Faces.

### Hierarchy
Eight steps, and every size in the app is one of them.
- **Display** (600, 52px, 44px on a phone, line-height 1.25, tabular figures): the month's total, the biggest thing on the board, and the amount owed in Pooleks.
- **Headline** (600, 40px, 34px on a phone, line-height 1): the month's name on the stage, and the title of a page of its own (Settings, the first run, the setup screens, not found, couldn't open); "Kopikas" over the sign-in card at 34px.
- **Wordmark** (600, 26px, line-height 1, -0.01em): "Kopikas" in the header, beside the coin, and who owes whom in Pooleks.
- **Title** (600, 20px): section heads such as "Every charge" and "To file", the phone queue's "N to file", an empty section's head, and Clerk's card title.
- **Small head** (Fredoka 600, 16px): a head that sits inside a section, such as "Loose change" by the pile and the months in Pooleks.
- **Body** (400, 15px, line-height 1.375): merchant names, amounts in lists, rows on the phone, navigation.
- **Label** (500, 13px): category chips and rule chips, roll names and the phone queue's category tiles, "Nothing yet" and captions.
- **Caption** (400, 12px): the smallest text, always under or beside a Label: a roll's limit, a queue tile's amount, the year strip's month letters, the pile's count, the balance after a Pooleks line, technical details under an error.

### Named Rules
**The Rounded Voice Rule.** Fredoka speaks, Rubik informs. Fredoka is for the wordmark, the month, the total and section heads only; every list, label and sentence is Rubik.

**The Tabular Rule.** Every amount that sits above or beside another amount uses tabular figures, in Estonian format (comma decimals, space thousands: 10 700,40 €).

## Layout

One centred column, 1200px wide at most, with 20px side padding on a phone and 24px from 640px up. From 1900px the board spreads out instead (below).

The board opens on the **stage**: a full-width Oat Paper panel in two bands. The head holds the month's name with a stepper, the total, last month's total and one muted line of figures on the left (Received, your share in a month with splits, the account balances and Investments, marked "Today:" in past months), and the loose-change pile with its count on the right: you pick a coin up there and drop it on a roll below. The stage has no narrator. The floor below takes the panel's full width, its tallest roll standing 280px while every roll fits in one row, with "Edit categories" under it. On desktop, a few squiggles and dots float around the loose change, away from every number and from every spot a coin can take: never a dash, which on the stage means a limit, and never a coin, which would read as one more to file. Nothing floats up by the month. Below the stage, on one grid with a 32px gap, "Every charge" fills the left and a 380px column on the right holds Pooleks and Subscriptions from 1024px up. Below 1024px the column's cards sit above the list, led from 640px by a To file card of the month's loose change as rows.

On a wide screen (1900px and up) the board shows the month at once: the column grows to 2280px at most, the stage keeps its 1152px on the left with Pooleks and Subscriptions side by side under it, and every charge fills the right-hand side, starting at the top beside the stage. The stage and the cards under it travel as one column beside the charges: they go with the page until an edge reaches the window's, then hold there, the stage's top 20px from the top or the cards' bottom 80px from the bottom (the page's own bottom padding). Scrolling down keeps the rolls and the cards in view, so any row can be dragged onto a roll from anywhere in the list; scrolling up brings the month back; a list opened in the cards reaches further down; and nothing ever goes under the stage. Below 1900px nothing changes.

On an ultrawide (2700px wide and 1104px tall or more) the stage is drawn a third larger, 1536px wide and about 990px tall: the whole picture magnified at once, rolls, coins, the total and its words alike, so the type scale and every proportion hold. The charges keep their 1048px and the column grows to 2664px, about three quarters of a 3440px screen. A coin filed from the stage flies at the stage's size. A wide screen too short for that keeps the 1152px stage.

The stage shows one month at a time: its pile holds that month's loose change, and a line under it leads to other months with coins waiting. A month, a chosen roll and a search live in the address (`?month=`, `?cat=`, `?q=`; `cat=Incoming` for money in), so a view can be linked.

On a phone (639px and below) the board is two tabs in a bar at the bottom, in thumb reach: **To file**, the backlog from every month one coin at a time, and **Month**, the stage with the charges and cards below it. It opens on To file while anything waits, unless the address asks for a view of the month. On Month the stage reflows instead of shrinking. The rolls lie down as horizontal bars in one list, each with its name and amount above it, and the categories with nothing filed yet gather in one "Nothing yet" line after the list; the loose change sits in one row between the total and the list.

Rolls sit in 84px columns with a 20px gap while they fit. The column narrows with the count, to 60px at the least, and past what fits in one row the floor wraps to a second shelf on the same scale; it never scrolls sideways. A floor that wraps keeps the shorter 200px stage, so its second shelf isn't mostly air. At 1440px twelve categories stand in one row of 72px columns.

**The Clear Air Rule.** Nothing decorative overlaps a figure. Floaters and confetti live where no number is.

## Elevation & Depth

Flat paper cut-outs. Surfaces have no shadows; depth comes from tone (Page White, then Oat Paper, then white cards on it) and from one thing only: the soft oval each character stands on.

### Shadow Vocabulary
- **Floor oval**: a flat ellipse in black at 12% (35% in dark) under every character and roll. It is what the character stands on, and it shrinks and fades when the character leaves the ground.

### Named Rules
**The Paper Cut-Out Rule.** Nothing casts a drop shadow. Stack with tone, not with shadows.

## Shapes

Round and soft. Panels have generous corners (the stage and its siblings 28px), cards 16px, rolls 22px, and every control that is pressed rather than read is a full pill. Characters are drawn as SVG with gently wobbled edges: each shape is sampled evenly and nudged in long, eased waves, so sides bend softly and corners stay round. The handmade feel comes from that wobble, never from a filter.

Coins are discs turned a touch so their darker rim shows below and to the right; rolls are upright wobbled rectangles with a face near the top; Kopikas is a copper coin with a struck k on his forehead, limbs of one curve each, and mitten hands.

**The Wobble, Not Filter Rule.** Edges stay vector-smooth at any zoom. No displacement or turbulence filters: they read as hairy or pixelated.

**The Two Dots and a Curve Rule.** Every face is two dots and a curve (open when glad, round when surprised, shut arcs for joy, one eye raised and the curve tilted when puzzled, two flat lines and one small z for sleep). No googly eyes, teeth or tongues on categories.

## Components

### The Stage (signature)
The month as one picture.
- **Shape:** an Oat Paper panel with 28px corners, 32px padding on desktop (24px on a phone), clipping its floaters.
- **Contents:** in the head, month and stepper and the total in Display on the left, the loose-change pile and its count on the right; below, the floor of rolls across the full width.
- **Motion:** rolls rise on load, floaters drift slowly, faces blink on their own clocks.

### Rolls
A category as a character, at one of four stages. It grows as coins go in.
- **Shape:** an upright wobbled body in its wrapper colour, 22px corners, standing on a floor oval. On a phone it lies down as a bar.
- **Scale:** the body's height is the month's amount on one shared scale, never more, with a 4px floor (8px as a bar) so a few cents still show.
- **Limits:** under its limit, a roll stands in a dashed Crayon Blue outline the limit's height, a jar it is filling. Past it, the body stands at its full amount, the dashed line crosses it where the limit is, and the part above the line is the wrapper deepened, as the sleeping footprint is. One colour family, so the overspend reads as the same money on every wrapper and both grounds. The limit is also a number: "of 200 €" in muted Label under the amount on the floor, "236,46 € of 200 €" on a phone row, with the amount in 500 when over; whole euros unless the limit has cents. A sleeper shows no limit and does not stretch the scale until its first coin.
- **Stages.** The face follows the body; nothing of fixed size is ever stacked on it or set beside it.
  - *Grown:* a body of 32px or more holds the full face, 9px under the top from 51px up and centred in the body below that. As a bar, a length of 26px or more holds it, at the tip from 33px and centred below that.
  - *Hatchling:* a body too short for a face shows the two eyes alone, in the stage's ink (Face Navy on Oat Paper, Face Cream on Oat Paper Night), floating 4px above the body and never touching it. As a bar, the eyes sit inside the bar from 14px, and under 14px the bar is plain; the amount beside it does the talking.
  - *Asleep:* nothing filed yet. A dashed footprint where the body would stand, in the wrapper colour deepened a third toward Ink (a quarter toward Chalk in dark), with two flat shut eyes and one small z above it in the stage's ink. Still a drop target. As a bar there is no row: the sleepers gather in one "Nothing yet" line after the list, each a 30 by 26 blob in its wrapper colour carrying the shut eyes and the z, its name beside it in Ink or Chalk.
  - *Over:* past its limit, the round "wow" mouth and the deepened overflow; a hatchling's eyes float above the whole roll, overflow included.
- **The floor:** every category stands on it every month, in the list's order, so a roll keeps its address and a zero is seen. Roll width comes from the count, from the 84px column down to a 60px one; past what fits in one row the floor wraps to a second shelf on the same scale. It never scrolls sideways.
- **States:** while a coin is held, every roll that can take it bobs, and the one under the pointer grows to 1.06 and leans a little; on a drop it gulps (squashes to 0.9 and springs back) and grows to its new height. Pressed, a roll squashes toward where it stands: to 0.96 from its foot (a bar to 0.98 from its start, a sleeper's blob to 0.96), then springs back. The first coin wakes a sleeper: its eyes open and a body starts under them; at the grown line the mouth arrives. With reduced motion the stages swap in place.
- **Choosing:** with no coin held, tapping a roll chooses it: the other rolls fade to 40%, the list shows its charges, and its year takes the figures line's place. Tapping it again, or "Show all", lets it go.
- **Drop target:** on desktop a row of the charges list dragged onto a roll files there, the same as a coin.

### Coins
A charge as a coin.
- **Shape:** a painted disc in copper, brass or nickel with a face, 40px on the stage and in the pile (38px on a phone).
- **Face:** a coin still to file is lost: puzzled, one eye raised and its curve tilted, the raised eye alternating so a pile isn't one face repeated. It has not found its roll yet; the words beside the pile say how many wait. Every other coin smiles: the wordmark's, the empty pile's, one in the air.
- **Behaviour:** pick a coin and tap a roll; it hops along an arc into the roll. A picked coin turns and smiles, as if it has found its way. After filing on the stage, focus moves to the next loose coin, or to the month's name once the pile is empty.

### The Year Strip
A chosen roll's last twelve months, in the stage head where the figures line sits otherwise.
- **Shape:** a bar per month, up to 440px wide in all, drawn like the rolls: the wrapper colour, wobbled edges, the part past the limit deepened, the limit one dashed line across all twelve. The month on show is at full strength, the others at 55%; the month letters run under the bars, the one on show in Ink.
- **Words:** "{Category}, the last 12 months" in Ink at 500, then the average and the limit in Muted: the average leaves out the unfinished month and those before the charges start.
- **Behaviour:** a bar takes the stage to its month; bars before the first charge are off. Each bar is a button at least 24px wide.

### To File, One Coin at a Time (phone)
The phone's To file tab: the backlog as a queue.
- **Shape:** an Oat Paper panel: "N to file" (and "N skipped"), one big painted coin with the merchant in Fredoka 20, the amount and day under it, then Skip and "Split with {partner}" as outlined pills (no fill, a 1.5px ring of Ink at 15%, white at 15% in dark) that shrink a little under the thumb like the tiles, then "Where do I go?", the lost coin asking, over a two-column grid of white tiles (card-oat-night in dark), the only solid things to tap, one per category, each with its roll in miniature (awake while it holds money in the coin's month, asleep with shut eyes and a z when it holds nothing, as in the Month tab's "Nothing yet" line), its name (two lines at most, never cut) and what it holds in the coin's month.
- **Behaviour:** a tile files the coin with the usual notice (Always, Undo) and the next coin drops in; Skip sends a coin to the back; an empty queue says "All filed" and leads to the month. Skip and Split stay put from coin to coin, above the fold.

### Pooleks
The shared statement: one page for both, the labels flipped by who reads it.
- **Head:** an Oat Paper panel: the lines since the last repayment, who owes whom in Fredoka, the amount in Display, then Settle up (Ink) and Add expense (white; on a phone, the message box instead). Beside it from 1024px, above it below that, what each has paid since the repayment as two loose piles: the owner's coins copper and the partner's brass, whoever is reading. The piles follow the larger amount and only decorate it; the figures are written under them.
- **Statement:** month by month, newest first. Each line is a white row with its payer's coin, the name beside the amount, the category and day beside which way it goes, and who paid and whose part under both (with the day, on a phone). Details adds what was spent together that month and the balance after each line. Everything before the last repayment folds into one dashed line that opens.
- **Message box (phone):** a Mist pill fixed at the foot of the screen, "Add something you paid for…": say what it was, and the add dialog opens with it filled in, on the amount.
- **Wide (1900px and up):** as on the board, the head (720px) on the left, staying put, and the statement beside it from the top at the board's charges width (1048px). On an ultrawide, as the board's stage, the head is drawn a third larger (960px) and the statement keeps its width.

### First Run
A fresh deployment's board, waiting: an empty board is not a quiet month.
- **Shape:** the tray itself. Its head says "Before your first month", then "Connect your LHV account" in Fredoka, a line on what happens, the two steps in Ink discs, the token field (a white pill with its own border, and an Ink Connect pill) and the read-only note with a lock. Below, every category but Savings asleep on the floor in its colour at 0,00 €, in rows that balance (one from 1024px, two halves below that); on a phone they sleep in one "Nothing yet" list. Connecting opens the board with those rolls growing.
- **States:** the line under the field says where the connection is (checking with LHV, fetching, opening the board), a failure in a sun-yellow tint with its technical details folded beneath, and a token stored without a sync offers to run it.
- **Before it:** "Who owns this board?" and "Not on this board" wear the same frame, without the floor.

### Sign-in, Not Found and Couldn't Open
- **Sign-in:** the coin, "Kopikas" in Fredoka and "iga kopikas loeb" over Clerk's card, which wears the board's look: one piece of Oat Paper with 28px corners, "Secured by Clerk" included, white pill fields with their own edge as the token field has, a flat Ink pill, Rubik with a Fredoka title, in both themes. The same theme dresses Clerk's account menu in every header.
- **Not found:** one coin, surprised and tilted as if it rolled off, "This page isn't on the board", a sentence on why, and Back to the board.
- **Couldn't open:** a page that failed to open, the not-found page's sibling: the coin tipped onto its side over its floor oval, still smiling, "This page couldn't open", that nothing filed is lost and trying again usually works, Try again (Ink) and Back to the board (white, not on the board itself), and the server's reference in Muted for the log. When the root layout itself fails, the same page shows without the header, in the light theme.

### Loading
While a page opens: its own shape in quiet tones, so nothing jumps when it fills in. The board's tray with bars for the month, the total and the figures, three empty discs for the pile and a stub per roll with its name and amount; Pooleks' head with its two piles and the statement's lines; Settings' title, jump pills, connection line and rule cards. Shapes on Oat Paper are Ink at 7%, on the page Mist. No faces and no heights: a placeholder never looks like money. It waits 300ms before fading in, so most opens finish first and show nothing at all.

### Settings
The bank connection and what the board has been taught.
- **Shape:** a Fredoka title and jump pills (Mist, with counts), then Oat Paper panels. The connection is one line from 1024px: the status with its dot (Received Green when connected, sun-yellow when late, Muted when not yet), the accounts and when they last synced, then Replace the token (white) and Sync now (Ink); on a phone the buttons stack, Sync now on top. The token's form opens under it in a white card, and is open by itself until a token is stored.
- **Filing rules:** a card per category in its wrapper colour, flowing into one, two or three columns by height so no card leaves a hole beside another. Each rule is a chip: what it matches, how many charges it matches, and a ✕ that is 24px to see and 44px to press on touch; the full sentence, with when it was added, is in its title and the ✕'s name. The rules that match nothing come first in a dashed card, each with its category. A search appears past eight rules.
- **Pooleks rules:** the same chips, white on the Oat Paper, with the partner's part.
- **Wide (1900px and up):** two columns: the title, the connection and the Pooleks rules (720px) on the left, and the filing rules on the right from the top, so the whole page often fits one screen. On an ultrawide the page takes the board's width (2664px) and the filing rules flow into four columns; nothing here is a picture, so nothing is magnified.

### Kopikas and the Speech Bubble (off the stage)
Taken off the painted stage on 2026-10-15, with his bubble: the stage reads better with the rolls and the loose coins as the only characters. The coin beside the wordmark stays. His eight poses remain in the code, drawn (their Lottie file was removed on 2026-10-18, since it only ever played on the painted stage), and `/coins/kopikas` shows them; the bubble went with the goofy look's prototype on 2026-10-19 and lives on in git history. Neither is to be put back on the painted stage without a new decision.
- **Voice, kept for screen readers:** progress first, never shaming ("Hi! 2 coins to sort in September.", "In it goes!", "All sorted! Every coin is in its roll."), announced politely after every step.

### Buttons and Pills
- **Shape:** full pill.
- **Toggle:** Muted Label text; the active option is an Ink pill with white text (Chalk pill with Ink text in dark).
- **The phone's tab bar:** Muted Body text; the active tab wears the colour of the panel it shows, an Oat Paper pill with Ink text (Oat Paper Night with Chalk in dark), so the brightest thing on the screen stays the coin above it.
- **Navigation links** (Pooleks, Settings): Body type, 8px by 14px pill that fills with Mist on hover and gives a little on press (to 96%, like the To file buttons; still with reduced motion).

### Category Chips
- **Style:** a white pill (card-night in dark, card-oat-night on a panel) with the wrapper colour as a dot and the name in Label type, 4px by 10px. An unfiled charge shows a dashed outline pill instead.

### Cards
- **Style:** Page White on Oat Paper (card-oat-night on Oat Paper Night), 16px corners, 12px padding, no border, no shadow.

### Menus
- **Style:** a white card (card-night) with 16px corners, a 1px Ink ring at 10% and 6px padding; rows of Body type in 12px-cornered rows that fill with Mist when highlighted; groups divided by a hairline. A charge's chip opens one (its category, a split with the partner, Name and icon…); a subscription's ⋯ opens one (Name and icon…, Make yearly or monthly, Stop tracking).

### Notices
- **Style:** one line of what happened ("Filed Coop under Groceries."), with Undo, and Always where a rule can be taught. Errors say what went wrong, with a retry where one helps, behind a Stamp Red alert icon.
- **Shape:** dressed as a menu: a white card (card-night in dark) with a 1px Ink ring at 10% and no shadow, at the foot of the screen (above the tab bar on a phone). The buttons are Mist pills and the ✕ is round; when the words need the room, the buttons drop under them to the right, so a phone shows two lines, never more.

### Inputs
- **Text fields:** type at 16px, a step above Body, because iOS zooms into any field set smaller.
- **Select pill:** Mist fill, 2px Ink border at 10% (25% on hover), full pill, 40px tall, Body type at 500.
- **Focus:** a visible 2px Ink outline (Chalk in dark) offset by 2px on every control, following the control's own corners. In Tailwind 4 both `outline-none` and `outline-hidden` also cancel a later outline's style, so the focus state sets it back with `outline-solid`.
- **Skip link:** "Skip to the charges", an Ink pill top left on the first Tab, past the rolls and the cards to the list; on a phone it opens the Month tab first.

### Header
- **Contents:** the coin and the wordmark, with when the last sync was under it in Muted at 13px on the board; the other pages as links on the right (icons on a phone), Pooleks and Settings from the board, Board and Settings from Pooleks, Board and Pooleks from Settings, none for the partner; and the theme toggle.
- **Icons:** flat cut-outs, like the look's paper ones (`components/header-icons.tsx`): a solid house with an arched door cut through for the Board, two solid coins for Pooleks, the front one cut free of the back, and a solid cog with a hole for Settings, in Ink (Chalk in dark) at 20px; the theme's sun and moon solid too, in Muted at 16px. They fill with the text colour and their gaps are cut through, so a hover fill shows in them. The logo coin stays the header's only colour.
- **Late sync:** more than a day and two hours without one, the line becomes "Last synced 3 days ago. Check the connection" in Ink with a small sun-yellow dot, and leads to Settings; on a phone it takes its own line under the header.

### App Icons
- **Shape:** the header's smiling coin, no letter on it. The browser tab's (`app/icon.svg`) has its face a third larger so it reads at 16px. The home screen's (`app/apple-icon.png`, `public/icon-192.png` and `icon-512.png`) sets that coin at 70% on a full Oat Paper square, which iOS rounds and Android masks; the coin stays inside Android's round safe zone, so the 512px icon is also the maskable one.
- **Behaviour:** added to a home screen, Kopikas opens full screen like an app (`app/manifest.ts`). The browser's bar takes the page's ground, Page White or Night, following the system's theme rather than the header's toggle.

### Motion
Springs everywhere: the general one at stiffness 260 and damping 18, rolls at 200 and 20. A gulp lasts 0.6s, a hop 0.7s (easing out, then in), rolls rise over 1.1s on `cubic-bezier(0.16, 1, 0.3, 1)`, floaters drift ±7px and ±7° back and forth. A press takes 0.16s on the same curve and springs back; a loading screen fades in over 0.2s after waiting 0.3s. While a request is out, the painted coin hops beside its words, the app's one loading sign: every 0.9s it rises 38% of its height and squashes from its foot as it lands. With reduced motion every state stays and the movement goes.

## Do's and Don'ts

### Do:
- **Do** keep every amount as text beside its drawing, in tabular figures and Estonian format, on the stage and in every list.
- **Do** give each category its wrapper by its place in the list, the same in every look and on every screen.
- **Do** keep decoration in clear air: floaters, confetti and dashes never overlap a number.
- **Do** draw faces as two dots and a curve in Crayon Blue, or Face Navy and Face Cream on wrappers, and say every state in words as well.
- **Do** stack depth with tone: Page White, then Oat Paper, then white cards; the only shadow is the floor oval.
- **Do** keep text at 4.5:1 or better on its ground in both themes, including Received Green on Oat Paper.
- **Do** honour reduced motion by keeping every state and dropping the movement.

### Don't:
- **Don't** use stat cards, sparklines or grey dashboard cards; the month is shown by the stage, not by tiles.
- **Don't** let a character's minimum size set a number's size: a roll's height is its amount.
- **Don't** use SVG filters for the handmade edge; the wobble is in the path.
- **Don't** extend the goofy look: no googly eyes, teeth, tongues or boiling lines on categories.
- **Don't** drop a shadow on cards or panels.
- **Don't** use Fredoka for lists, labels or running text.
