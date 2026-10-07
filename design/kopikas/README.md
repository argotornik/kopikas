# Kopikas, animated

All eight of Kopikas's poses are animated in one Lottie file, `public/kopikas.lottie`. The board plays seven of them from it; friendly, the hover, stays drawn in code so its eyes follow the pointer. The file is built by a script from the same data as the code-drawn Kopikas (`components/kopikas-figure.ts`), so the two always match:

```
npm run kopikas:lottie
```

Run it again after changing a pose in `kopikas-figure.ts` or the motion in `scripts/kopikas-lottie.mjs`.

## The animations

The board asks for each animation by name. All eight are made.

| Name | Moment | Plays | Length | What happens | Made |
|---|---|---|---|---|---|
| `hello` | arriving on the board | once, then holds | 1.2 s | crouches, pops up leaning in, opens one arm wide, waves the other twice, blinks, settles on the hello pose | yes |
| `jump` | a coin landed | once, then holds | 0.9 s | crouches with arms swung back, springs up tucking its legs, lands with a squash, wobbles still, stands | yes |
| `excited` | everything sorted | loops | 1.8 s | eyes shut with joy, hops with arms pumping and rests between hops, sways, sparkles twinkle and confetti bobs | yes |
| `friendly` | hovered | loops | 1.5 s | head tilted and swaying, lifts one small hand twice, blinks | yes |
| `saving` | loose change waiting | loops | 2.4 s | breathes and bobs, eyes on the coin, turns it edge-on and back while its glint fades and twinkles back | yes |
| `budgeting` | filing a coin | loops | 2.4 s | leans into the list, eyes drop a row, a tick draws itself into the third box, a small smile; the tick fades before the loop | yes |
| `resting` | nothing to file | loops | 3 s | sits cross-legged, hands on the floor, breathes; lids grow heavy as the head dips, then lift | yes |
| `proud` | a past month came in under the one before | once, then holds | 1.2 s | puffs up, hands to hips, chin up; the eyes squeeze shut into contented arcs under lifted brows as the smile widens | yes |

A one-shot ends on a pose the code-drawn Kopikas can take over from, and a loop starts and ends on its pose, so switching between moments never jumps. With reduced motion on, Kopikas is always the still, code-drawn figure.

## Tuning by eye

Timing lives in `TIMING` in `scripts/kopikas-lottie.mjs`: for each animation, pairs of [frame as choreographed, frame played] at its phase boundaries, so a phase can be made quicker or slower without touching the moves. Today hello runs quicker than choreographed, jump as choreographed and excited softer, with a rest between hops; the three were picked from side-by-side versions.

Open `public/kopikas.lottie` in Lottie Creator to try timing or easing by eye. The script is the source, so carry what works back into it (keyframes are frame numbers at 60 fps) and rebuild; editing the file alone is overwritten by the next build.

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
| `prop-checklist` | budgeting's list, behind the arm that holds it; it nods, and the third row's tick draws itself in |
| `eyes`, `brows`, `mouth` | dot eyes that blink and can look at a prop, joyful closed arcs (excited), contented arcs (proud) or sleepy lids that droop (resting); brows only in proud; the open mouth with its tongue, or a stroke that can widen into a smile |
| `prop-coin` | saving's coin, in front of the hands; it turns edge-on, and its glint twinkles |
| `wave-marks`, `sparkles` | only in hello and excited |

In saving the arms sit in front of the coin, and in resting the body sits lowered onto the floor.

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

The code-drawn Kopikas follows the pointer with its eyes (except in saving and budgeting, where they stay on the prop); a Lottie animation plays as drawn and cannot. Only friendly (the hover) has eyes that follow the pointer, so it is the one pose the board keeps drawn; saving and budgeting keep their eyes on the prop, resting's are sleepy and proud's closed, so they lose nothing in the file.

The drawn Kopikas stays underneath the animations (`components/kopikas-animated.tsx`), so poses still spring into each other: the idle loops (saving, budgeting, resting) take over once the drawn figure has settled into their pose, 0.4 s after the change, and the one-shots and excited start at once from their own opening. Each animation hides the drawn figure in the same task it first paints, and shows it again on the way out.
