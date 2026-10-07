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
  received-green: "#0E8A4A"
  received-green-night: "#4FD18B"
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
  speech-bubble:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
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

The mood is warm, playful and tidy. Warm comes from Oat Paper, copper and the painted wrapper colours. Playful comes from the cast, the coin rolls and Kopikas the coin, who blink, gulp, hop and narrate in plain, progress-first sentences. Tidy is the point of the product: filing a coin into its roll is a small satisfying act, and the layout stays orderly so the fun never gets in the way of reading the month. Density is relaxed on the stage and plain in the lists.

The world is built on the board's coin tray (`/coins`): every charge is a coin, every category a roll with a face, the month a row of rolls on one shared scale. It replaces the current board at `/` and its finance-dashboard vocabulary of stat cards, sparklines and grey cards, and refuses the cold bank register. A goofy alternative look (googly eyes, tongues, a boiling line) still sits one click away on the prototype; it was judged too goofy and is not to be extended.

**Key Characteristics:**
- Painted characters with vector-smooth, gently wobbled edges; faces of two dots and a curve.
- A white page, an Oat Paper stage, and bright-but-matte wrapper colours, one per category.
- Fredoka for the voice (wordmark, month, total, section heads), Rubik for everything that is read.
- Flat paper cut-outs: depth only from the oval each character stands on and the speech bubble's lift.
- Springy, small motion that rewards filing, and that keeps every state when motion is reduced.

## Colors

A white page, a warm oat stage, copper as the house colour, Crayon Blue for every painted face, and thirteen matte wrapper colours that each belong to one category.

### Primary
- **Kopikas Copper** (copper): the house colour, carried by the coin: Kopikas's body, the wordmark coin, the loose coins in the pile. Its darker **Copper Edge** shows the coin's turned rim, **Copper Ring** the struck ring, and **Copper K** the embossed k. Coins also come in **Brass** and **Nickel**, so a pile reads as loose change rather than one colour repeated.

### Secondary
- **Crayon Blue** (crayon-blue): the ink of every painted face, Kopikas's eyes and mouth, and the fine dashes floating in the air. On a light wrapper a face is drawn in **Face Navy**, on a dark one in **Face Cream**, so it always reads on its own roll.

### Tertiary
- **The wrappers** (wrapper-cornflower, -tomato, -pink, -grass, -brown, -sky, -lime, -lavender, -yolk, -grey, -brick, -mint, -apricot): one per category, in that order, by the category's place in the list. They are the brightest things on the page and the only large areas of colour; everything around them stays neutral so the month's shape reads first.

### Neutral
- **Page White** (page-white) and **Night** (night): the page ground in light and dark. Cards and the speech bubble sit on Page White (card-night in dark).
- **Oat Paper** (oat-paper) and **Oat Paper Night** (oat-paper-night): the stage and the panels below it, where the characters live.
- **Mist** (mist) and **Mist Night** (mist-night): quiet fills for inputs, hover backgrounds and the plain panel.
- **Ink** (ink) and **Chalk** (chalk): all text and the active pill, in light and dark. Ink on Oat Paper is 15:1.
- **Muted** (muted) and **Muted Night** (muted-night): secondary text, captions and the prototype strip; 4.8:1 on Oat Paper, 7.1:1 on Oat Paper Night.
- **Limb Brown** (limb-brown) and **Limb Sand** (limb-sand): the characters' arms, legs and dark marks, swapped by theme so feet and confetti never vanish on the night ground.
- **Received Green** (received-green / received-green-night): money coming in. On Oat Paper the light value is only 3.7:1 and must be deepened to reach 4.5:1; the night value (8.6:1) is fine.

### Named Rules
**The One Wrapper Rule.** A category owns one wrapper colour, given by its place in the list, everywhere it appears. Never pick a wrapper for looks.

**The Oat Paper Rule.** Oat Paper is where characters live: the stage and its sibling panels. The page itself stays Page White, so the stage reads as a place.

**The Face Is Decoration Rule.** Crayon Blue on copper is 1.4:1. A face may show a mood but never carries meaning on its own; every state it shows is also said in words.

## Typography

**Display Font:** Fredoka (with ui-rounded, system-ui, sans-serif)
**Body Font:** Rubik (with system-ui, sans-serif)

**Character:** Fredoka is round, soft and bold: the friendly voice of the book. Rubik is a calm, slightly rounded sans for everything that is read and compared. Fredoka is provisional: the display face may still change to one chosen from Free Faces.

### Hierarchy
- **Display** (600, 52px, 44px on a phone, line-height 1.25, tabular figures): the month's total, the biggest thing on the board.
- **Headline** (600, 40px, 34px on a phone, line-height 1): the month's name on the stage.
- **Wordmark** (600, 26px, line-height 1, -0.01em): "Kopikas" in the header, beside the coin.
- **Title** (600, 20px): section heads such as "Every charge" and "To file".
- **Body** (400, 15px, line-height 1.375): merchant names, amounts in lists, the speech bubble, navigation.
- **Label** (500, 13px): category chips, roll names, captions and the prototype strip.

### Named Rules
**The Rounded Voice Rule.** Fredoka speaks, Rubik informs. Fredoka is for the wordmark, the month, the total and section heads only; every list, label and sentence is Rubik.

**The Tabular Rule.** Every amount that sits above or beside another amount uses tabular figures, in Estonian format (comma decimals, space thousands: 10 700,40 €).

## Layout

One centred column, 1200px wide at most, with 20px side padding on a phone and 24px from 640px up.

The board opens on the **stage**: a full-width Oat Paper panel holding the month's name with a stepper, the total, the loose-change pile with its count, Kopikas with his speech bubble, and the rolls standing in one row on a shared floor. On desktop, decoration (floating coins, confetti, dashes) is kept to the stage's upper right, away from every number. Below the stage, on one grid with a 32px gap, the ledger by day fills the left and the to-file queue a 380px column on the right from 1024px up.

On a phone (639px and below) the stage reflows instead of shrinking. The rolls lie down as horizontal bars in one list, each with its name and amount above it; Kopikas moves to the stage's top-right corner at 62px; the speech bubble runs full width under the total. The phone's job is the to-file queue.

Rolls currently sit in fixed 84px columns with a 20px gap, so about eight fit at 1440px; a household's full set of categories does not yet fit. Roll width should come from the number of rolls.

**The Clear Air Rule.** Nothing decorative overlaps a figure. Floaters and confetti live where no number is.

## Elevation & Depth

Flat paper cut-outs. Surfaces have no shadows; depth comes from tone (Page White, then Oat Paper, then white cards on it) and from two things only: the soft oval each character stands on, and the speech bubble's gentle lift.

### Shadow Vocabulary
- **Floor oval**: a flat ellipse in black at 12% (35% in dark) under every character and roll. It is what the character stands on, and it shrinks and fades when the character leaves the ground.
- **Bubble lift** (`box-shadow: 0 10px 30px -14px rgb(0 0 0 / 0.3)`): the speech bubble only, so Kopikas's voice floats above the stage.

### Named Rules
**The Paper Cut-Out Rule.** Nothing casts a drop shadow except the speech bubble. Stack with tone, not with shadows.

## Shapes

Round and soft. Panels have generous corners (the stage and its siblings 28px), cards and the speech bubble 16px, rolls 22px, and every control that is pressed rather than read is a full pill. Characters are drawn as SVG with gently wobbled edges: each shape is sampled evenly and nudged in long, eased waves, so sides bend softly and corners stay round. The handmade feel comes from that wobble, never from a filter.

Coins are discs turned a touch so their darker rim shows below and to the right; rolls are upright wobbled rectangles with a face near the top; Kopikas is a copper coin with a struck k on his forehead, limbs of one curve each, and mitten hands.

**The Wobble, Not Filter Rule.** Edges stay vector-smooth at any zoom. No displacement or turbulence filters: they read as hairy or pixelated.

**The Two Dots and a Curve Rule.** Every face is two dots and a curve (open when glad, round when surprised, shut arcs for joy). No googly eyes, teeth or tongues on categories.

## Components

### The Stage (signature)
The month as one picture.
- **Shape:** an Oat Paper panel with 28px corners, 32px padding on desktop (24px on a phone), clipping its floaters.
- **Contents:** month and stepper, the total in Display, the loose-change pile, Kopikas and his bubble, and the floor of rolls.
- **Motion:** rolls rise on load, floaters drift slowly, faces blink on their own clocks.

### Rolls
A category as a character.
- **Shape:** an upright wobbled body in its wrapper colour, 22px corners, a face near the top, standing on a floor oval. On a phone it lies down as a bar.
- **Scale:** the body's height is the month's amount on one shared scale; the limit, when set, is a dashed outline, and spending past it shows as a pink overflow above it.
- **States:** disabled until a coin is picked; while a coin is held, every roll that can take it bobs; on a drop it gulps (squashes to 0.9 and springs back) and grows to its new height.
- **Known gap:** the body currently has a 44px floor (34px as a bar), so small amounts read as equal. A roll's face should ride above a true-height body.

### Coins
A charge as a coin.
- **Shape:** a painted disc in copper, brass or nickel with a face, 40px on the stage (50px in the desktop pile, 38px on a phone).
- **Behaviour:** pick a coin and tap a roll; it hops along an arc into the roll. A picked coin turns and smiles.

### Kopikas
The coin who narrates.
- **Shape:** a copper coin with the k, Crayon Blue face, limbs in Limb Brown. Eight poses, one per moment of the board, each with its own lean, arms and face.
- **Behaviour:** he narrates in the speech bubble; his eyes follow the pointer except when held on a prop; seven poses play as animations, with the drawn figure underneath so poses still spring into each other.

### Speech Bubble
- **Style:** Page White (card-night in dark), Body type, 16px corners, 12px by 16px padding, with the Bubble lift. A small tail points at Kopikas.
- **Voice:** progress first, never shaming ("Hi! 2 coins to sort in September.", "In it goes!", "All sorted! Every coin is in its roll."). It exits fast (0.15s).

### Buttons and Pills
- **Shape:** full pill.
- **Toggle:** Muted Label text; the active option is an Ink pill with white text (Chalk pill with Ink text in dark).
- **Navigation links** (Pooleks, Settings): Body type, 8px by 14px pill that fills with Mist on hover.

### Category Chips
- **Style:** a white pill (card-night in dark) with the wrapper colour as a dot and the name in Label type, 4px by 10px. An unfiled charge shows a dashed outline pill instead.

### Cards
- **Style:** Page White (card-night) on Oat Paper, 16px corners, 12px padding, no border, no shadow.

### Inputs
- **Select pill:** Mist fill, 2px Ink border at 10% (25% on hover), full pill, 40px tall, Body type at 500.
- **Focus:** a visible 2px Ink outline (Chalk in dark) offset by 2px on every control. Note that pairing `outline-none` with a focus outline in Tailwind 4 hides it; use `outline-hidden`.

### Motion
Springs everywhere: the general one at stiffness 260 and damping 18, rolls at 200 and 20. A gulp lasts 0.6s, a hop 0.7s (easing out, then in), rolls rise over 1.1s on `cubic-bezier(0.16, 1, 0.3, 1)`, floaters drift ±7px and ±7° back and forth. With reduced motion every state stays and the movement goes.

## Do's and Don'ts

### Do:
- **Do** keep every amount as text beside its drawing, in tabular figures and Estonian format, on the stage and in every list.
- **Do** give each category its wrapper by its place in the list, the same in every look and on every screen.
- **Do** keep decoration in clear air: floaters, confetti and dashes never overlap a number.
- **Do** draw faces as two dots and a curve in Crayon Blue, or Face Navy and Face Cream on wrappers, and say every state in words as well.
- **Do** stack depth with tone: Page White, then Oat Paper, then white cards; the only shadows are the floor oval and the bubble's lift.
- **Do** keep text at 4.5:1 or better on its ground in both themes, including Received Green on Oat Paper.
- **Do** honour reduced motion by keeping every state and dropping the movement.

### Don't:
- **Don't** use stat cards, sparklines or grey dashboard cards; the month is shown by the stage, not by tiles.
- **Don't** let a character's minimum size set a number's size: a roll's height is its amount.
- **Don't** use SVG filters for the handmade edge; the wobble is in the path.
- **Don't** extend the goofy look: no googly eyes, teeth, tongues or boiling lines on categories.
- **Don't** drop a shadow on cards or panels.
- **Don't** use Fredoka for lists, labels or running text.
