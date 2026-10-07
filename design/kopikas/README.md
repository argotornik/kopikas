# Kopikas, for Lottie Creator

Eight poses of Kopikas as layered SVGs in `svg/`, one per moment of the board. Each is exported from the live character sheet (`/coins/kopikas`), so it matches the app exactly. Import them, animate them, and export one `.lottie` file; the board plays the right animation for each moment.

## Import

Drag a file from `svg/` into Lottie Creator and choose **Vector** (editable shape layers). The layers arrive named:

| Layer | What it is |
|---|---|
| `shadow` | the oval on the floor; it stays on the floor, and shrinks and fades as Kopikas leaves it |
| `leg-left`, `leg-right` | stroke plus foot |
| `body` | everything above the legs; move this for bounces and sitting |
| `tilt` | inside `body`: the lean, about the coin's centre; each pose has its own angle |
| `arm-left`, `arm-right` | stroke plus mitten hand |
| `coin` | `coin-edge`, `coin-face`, `coin-ring`, `k` |
| `eyes`, `brows`, `mouth` | the face: dot eyes, joyful closed arcs (excited), contented closed lids (proud) or sleepy lids (resting); brows only in proud |
| `prop-coin`, `prop-checklist`, `sparkles`, `wave-marks` | only in saving, budgeting, excited, hello; the checklist sits behind the arm so the hand holds it |

In `jump`, the legs and body sit in an unnamed group lifted 64 px off the floor.

The artboard is 592 × 624. Pivots for rigging, in artboard pixels:

| Pivot | x, y |
|---|---|
| left shoulder | 148, 344 |
| right shoulder | 428, 344 |
| left hip | 252, 436 |
| right hip | 324, 436 |
| coin centre | 288, 304 |
| lean (`tilt`) | 288, 320 |

## Colours and themes

Make three colour slots and two themes, named exactly `light` and `dark` (the board asks for them by those names), so one file works on both boards:

| Slot | Light | Dark |
|---|---|---|
| Limb (also the wave marks, at 45%) | `#3A2A20` | `#D9C7B4` |
| Shadow | black at 12% | black at 35% |
| Face | `#4C6FE0` | `#4C6FE0` |

The coin keeps its copper in both: face `#CB793E`, edge `#A45A2B`, ring `#E39C63`, k `#7C3F1D`.

## The animations

Name each animation exactly as below; the board asks for them by these names.

| Name | Moment | Plays | Length | Idea |
|---|---|---|---|---|
| `hello` | arriving on the board | once, then holds | ~1.6 s | pops in leaning, waves one arm twice with the other open wide, settles |
| `friendly` | hovered | loops | ~1.5 s | head tilted, one small hand lift |
| `saving` | loose change waiting | loops | ~2.4 s | gentle bob, turns the coin in its hands, eyes on it |
| `budgeting` | filing a coin | loops | ~2.4 s | leans into the list, ticks a box |
| `jump` | a coin landed | once | ~0.9 s | squash, jump, land, a little wobble |
| `excited` | everything sorted | loops | ~1.2 s | hops with arms pumping, sparkles twinkle |
| `resting` | nothing to file | loops | ~3 s | sits cross-legged, hands on the floor, breathes, heavy lids |
| `proud` | a past month came in under the one before | once, then holds | ~1.2 s | puffs up, hands to hips, chin up, eyes closed contentedly |

Keep the first and last frame of the looping ones in the standing pose from their SVG, so switching between moments never jumps.

## Export

Export **one `.lottie`** containing all eight animations and both themes, and put it at `public/kopikas.lottie` (or send it over). The board picks the animation by name and the theme from light or dark mode.

Until that file exists the board draws Kopikas in code, so nothing breaks while you work. Today the board plays `hello`, `jump` and `excited` from the file and keeps the code-drawn Kopikas for the idle moments, so its eyes still follow the pointer; the other five animations are ready for when you want them. With reduced motion on, Kopikas is always the still, code-drawn figure.

## One trade-off to know

The code-drawn Kopikas follows the pointer with its eyes (except in saving and budgeting, where they stay on the prop); a Lottie animation plays as drawn and cannot. Either the animation carries all the life, or the board keeps the code-drawn Kopikas for idle moments and plays Lottie for the set pieces (hello, jump, excited).
