# Kopikas, drawn

Kopikas's eight poses are data in `components/kopikas-figure.ts`, drawn in code by `components/kopikas-painted.tsx` and shown together on the character sheet at `/coins/kopikas`. He is off the painted stage (DESIGN.md, "Kopikas and the Speech Bubble").

`svg/` holds all eight poses as layered SVGs, exported from the character sheet, for importing into an animation tool or anything else. `review/` holds the second round of seven poses as they were reviewed.

## The Lottie file, removed

Until 2026-10-18 the poses were also animated in one Lottie file, `public/kopikas.lottie`, built from the same data by `scripts/kopikas-lottie.mjs` and played by `components/kopikas-animated.tsx`. It only ever played on the painted stage, so once Kopikas left it the file never showed, and the player was removed with it. All three are in git history at `fca7eb1`, with this README's earlier version describing the animations, their timing, the layers and the colour slots:

```
git show fca7eb1:design/kopikas/README.md
```
