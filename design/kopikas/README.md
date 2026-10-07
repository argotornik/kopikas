# Kopikas, animated

The board plays Kopikas's set pieces from one Lottie file, `public/kopikas.lottie`, and draws every other moment in code. The file is built by a script from the same data as the code-drawn Kopikas (`components/kopikas-figure.ts`), so the two always match:

```
npm run kopikas:lottie
```

Run it again after changing a pose in `kopikas-figure.ts` or the motion in `scripts/kopikas-lottie.mjs`.

## The animations

The board asks for each animation by name. Three are made; the rest are planned.

| Name | Moment | Plays | Length | What happens | Made |
|---|---|---|---|---|---|
| `hello` | arriving on the board | once, then holds | 1.6 s | crouches, pops up leaning in, opens one arm wide, waves the other twice, blinks, settles on the hello pose | yes |
| `jump` | a coin landed | once, then holds | 0.9 s | crouches with arms swung back, springs up tucking its legs, lands with a squash, wobbles still, stands | yes |
| `excited` | everything sorted | loops | 1.2 s | eyes shut with joy, hops with arms pumping, sways, sparkles twinkle and confetti bobs | yes |
| `friendly` | hovered | loops | ~1.5 s | head tilted, one small hand lift | |
| `saving` | loose change waiting | loops | ~2.4 s | gentle bob, turns the coin in its hands, eyes on it | |
| `budgeting` | filing a coin | loops | ~2.4 s | leans into the list, ticks a box | |
| `resting` | nothing to file | loops | ~3 s | sits cross-legged, hands on the floor, breathes, heavy lids | |
| `proud` | a past month came in under the one before | once, then holds | ~1.2 s | puffs up, hands to hips, chin up, eyes closed contentedly | |

A one-shot ends on a pose the code-drawn Kopikas can take over from, and a loop starts and ends on its pose, so switching between moments never jumps. With reduced motion on, Kopikas is always the still, code-drawn figure.

## Tuning by eye

Open `public/kopikas.lottie` in Lottie Creator to try timing or easing by eye. The script is the source, so carry what works back into `scripts/kopikas-lottie.mjs` (keyframes are frame numbers at 60 fps) and rebuild; editing the file alone is overwritten by the next build.

The artboard is 592 × 624 px: the figure's 124 × 150 units at 4 px each, inset 12 and 6 units for outstretched hands and sparkles. The layers, top-down from the root:

| Layer | What it is |
|---|---|
| `kopikas` | the root: scales figure units to pixels and adds the margin |
| `shadow` | the oval on the floor; it stays there, and shrinks and fades as Kopikas leaves it |
| `lift` | the figure off the ground |
| `squash` | squash and stretch, scaled from the feet |
| `leg-left`, `leg-right` | curve plus foot |
| `body`, `tilt` | everything above the legs; `tilt` is the lean, about the coin's centre |
| `arm-left`, `arm-right` | curve plus mitten hand; every limb is one curve, so any two poses morph |
| `coin` | `coin-edge`, `coin-face`, `coin-ring`, `k` |
| `eyes`, `mouth` | dot eyes that blink, or joyful closed arcs (excited); the open mouth with its tongue |
| `wave-marks`, `sparkles` | only in hello and excited |

Pivots, in artboard pixels:

| Pivot | x, y |
|---|---|
| left shoulder | 148, 344 |
| right shoulder | 428, 344 |
| left hip | 252, 436 |
| right hip | 324, 436 |
| coin centre | 288, 304 |
| lean (`tilt`) | 288, 320 |
| squash (the feet) | 288, 564 |

`svg/` still holds all eight poses as layered SVGs, exported from the live character sheet (`/coins/kopikas`), for importing into Lottie Creator or anything else.

## Colours and themes

One file serves both boards: three slots, and two themes named `light` and `dark` that fill them (dotLottie 2 themes). The board picks the theme from light or dark mode.

| Slot | Type | Light | Dark |
|---|---|---|---|
| `limb` (also the wave marks, at 45 %) | colour | `#3A2A20` | `#D9C7B4` |
| `face` | colour | `#4C6FE0` | `#4C6FE0` |
| `shadow_opacity` (black) | opacity | 12 % | 35 % |

The coin keeps its copper in both: face `#CB793E`, edge `#A45A2B`, ring `#E39C63`, k `#7C3F1D`.

## Two things to know

The player version in use ignores the animation's name at start-up and loads the file's first animation, so the board picks the right one as soon as the file has loaded (`components/kopikas-animated.tsx`).

The code-drawn Kopikas follows the pointer with its eyes (except in saving and budgeting, where they stay on the prop); a Lottie animation plays as drawn and cannot. So the board plays Lottie for the set pieces only and keeps the code-drawn Kopikas for idle moments.
