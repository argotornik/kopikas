// Kopikas, painted, as plain data: every shape and every pose, in the units
// of the figure's 124 by 150 box. The code-drawn Kopikas (kopikas-painted.tsx)
// and the Lottie file (scripts/kopikas-lottie.mjs) both draw from here, so the
// two never drift apart. No imports, so the build script can load it as is.

// Each pose belongs to one moment of the product, so the coin always says
// what is going on:
//   hello      arriving on the board (one arm waving, one open wide, leaning in)
//   friendly   hovered (one small hand lift, head tilted)
//   saving     loose change waiting (holding a coin up to show you)
//   budgeting  filing a coin (the list up by the face, eyes on it)
//   jump       a coin landed (off the ground)
//   excited    everything sorted (arms up, eyes shut with joy)
//   resting    nothing to file (sitting, legs out, sleepy)
//   proud      a past month that came in under the one before (chin up)
// Every pose has its own silhouette (the coin tilts, the arms change shape)
// and its own face, so it reads at a glance, even at 62 px on a phone.
export type PaintedPose = "hello" | "friendly" | "saving" | "budgeting" | "jump" | "excited" | "resting" | "proud";

export const COIN = { body: "#CB793E", edge: "#A45A2B", ring: "#E39C63", k: "#7C3F1D", kLight: "#EFB07C" };
export const FACE = "#4C6FE0";
export const TONGUE = "#F07A8C";
export const SPARKLE_FILL = "#F2B585";

// The coin, its edge showing below and to the right, the k embossed on its forehead.
export const COIN_SHAPE = {
  edge: { cx: 60 + 6, cy: 70 + 4, r: 37 },
  face: { cx: 60, cy: 70, r: 37 },
  ring: { cx: 60, cy: 70, r: 31, width: 1.8 },
  // The k twice: a light copy under the dark one, offset, for the emboss.
  k: [
    { x: 48.6, y: 32.4, scale: 0.72, fill: COIN.kLight },
    { x: 48.15, y: 31.7, scale: 0.72, fill: COIN.k },
  ],
};
export const K =
  "M11.18 23.6 L11.18 8.59 L14.16 8.59 L14.16 16.92 Q14.81 16.48 15.41 15.96 Q16.01 15.45 16.51 14.88 Q17.0 14.32 17.38 13.73 Q17.77 13.14 18.05 12.58 L21.51 12.58 Q21.2 13.37 20.69 14.18 Q20.17 14.99 19.47 15.68 Q18.76 16.36 17.84 16.84 Q16.91 17.32 15.8 17.49 L15.8 17.85 Q17.21 17.59 18.13 17.88 Q19.06 18.18 19.66 18.82 Q20.25 19.46 20.61 20.29 Q20.97 21.12 21.26 21.96 L21.74 23.6 L18.45 23.6 L18.17 22.57 Q17.88 21.54 17.52 20.77 Q17.17 19.99 16.59 19.56 Q16.01 19.13 15.0 19.13 L14.16 19.13 L14.16 23.6 L11.18 23.6 Z";
// The body leans about the coin's centre.
export const PIVOT = { x: 60, y: 74 };

export const LIMB_WIDTH = 7.5;
export const HAND_R = 6;
export const FOOT = { rx: 9.5, ry: 5 };
export const SHADOW = { cx: 60, cy: 134, rx: 27, ry: 4.2 };

// The face. Dot eyes (the right a touch smaller, turned away), and the ways
// they close: joy curves up, content curves down, sleepy lids half shut.
export const EYE_DOTS = [
  { cx: 49, cy: 63, rx: 4.2, ry: 5 },
  { cx: 71, cy: 62.4, rx: 4, ry: 4.8 },
];
export const EYE_STROKE = 3.4;
export const EYES_CLOSED = ["M44 63 Q49 57 54 63", "M66 62 Q71 56 76 62"];
export const EYES_CONTENT = ["M44 60.5 Q49 65.5 54 60.5", "M66 60 Q71 65 76 60"];
export const EYES_SLEEPY = [
  { lid: "M44.6 63 A4.4 3.2 0 0 0 53.4 63 Z", line: "M43.8 62.8 L54.2 62.8" },
  { lid: "M66.6 62.4 A4.2 3.1 0 0 0 75.4 62.4 Z", line: "M65.8 62.2 L76.2 62.2" },
];
export const BROWS = ["M45 52 Q49 48.5 53 50.5", "M67 51 Q71 47.5 75 49.5"];
export const MOUTHS = {
  open: { mouth: "M46 75 Q60 94 74 74 Z", tongue: "M52 83.5 Q60 90 68 83 Q60 79 52 83.5 Z" },
  small: { d: "M53 78 Q60 83 67 77.6", width: 3.2 },
  big: { d: "M45 74 Q60 92 75 73", width: 4 },
  smile: { d: "M47 76 Q60 89 73 75", width: 3.6 },
};

// The two marks either side of the waving hand on arrival, in the limb colour.
export const WAVE_MARKS = ["M1 33 Q-3 40 0 47", "M25 31 Q30 38 26 45"];
export const WAVE_MARK = { width: 2, opacity: 0.45 };
// Sparkles and confetti round Kopikas when everything is sorted.
export const SPARKLE = "M0 -6 C0.6 -1.6 1.6 -0.6 6 0 C1.6 0.6 0.6 1.6 0 6 C-0.6 1.6 -1.6 0.6 -6 0 C-1.6 -0.6 -0.6 -1.6 0 -6Z";
export const SPARKLES = [
  { x: 104, y: 26, scale: 1.1 },
  { x: 124, y: 30, scale: 0.6 },
  { x: 12, y: 94, scale: 0.9 },
];
export const CONFETTI = [
  { cx: 24, cy: 30, r: 2.4, fill: "#E2553B" },
  { cx: 110, cy: 96, r: 2, fill: "#5B7FE0" },
];

export type Pt = [number, number];
export type Frame = [string, Pt];
// Every limb is one quadratic curve, so poses blend into each other.
export type Shape = {
  armL: string;
  handL: Pt;
  armR: string;
  handR: Pt;
  legL: string;
  footL: Pt;
  legR: string;
  footR: Pt;
  tilt?: number; // degrees, about the coin's centre
  lift?: number; // the whole figure off the ground
  sit?: number; // the body lowered onto the floor
  armsFront?: boolean;
  eyes?: "dots" | "closed" | "content" | "sleepy";
  look?: Pt; // eyes held on a prop instead of following the pointer
  brows?: boolean;
  mouth?: "smile" | "open" | "small" | "big";
  shadow?: { rx: number; opacity: number };
  // A gesture: the arms play between two frames, once or for as long as the pose lasts.
  wave?: { l?: Frame[]; r?: Frame[]; repeat: boolean };
};

// The coin's edge sits on the right and hides the first part of a right arm, so
// right arms reach about 6 further out than their left mirror to look as long.
export const STAND = { legL: "M51 103 Q50 116 49 127", footL: [46, 130] as Pt, legR: "M69 103 Q70 116 71 127", footR: [74, 130] as Pt };
// Arrival: one arm up and waving, the other open wide. Hover: one small hand lift.
export const HELLO_L: Frame[] = [["M25 78 Q12 62 14 46", [14, 43]], ["M25 78 Q9 64 7 50", [7, 47]]];
export const HOVER_R: Frame[] = [["M97 80 Q110 74 110 64", [110, 61]], ["M97 80 Q113 76 115 67", [115, 64]]];

export const SHAPES: Record<PaintedPose, Shape> = {
  hello: {
    armL: HELLO_L[0][0],
    handL: HELLO_L[0][1],
    armR: "M97 80 Q112 80 119 72",
    handR: [121, 70],
    ...STAND,
    tilt: 5,
    mouth: "open",
    wave: { l: HELLO_L, repeat: false },
  },
  friendly: {
    armL: "M25 80 Q17 92 18 104",
    handL: [18, 106],
    armR: HOVER_R[0][0],
    handR: HOVER_R[0][1],
    ...STAND,
    tilt: 7,
    wave: { r: HOVER_R, repeat: true },
  },
  saving: {
    armL: "M28 90 Q32 103 46 98",
    handL: [48, 97],
    armR: "M96 90 Q92 104 74 98",
    handR: [72, 97],
    ...STAND,
    armsFront: true,
    look: [0, 2],
    mouth: "small",
  },
  budgeting: {
    armL: "M25 86 Q16 96 11 87",
    handL: [11, 85],
    armR: "M97 82 Q109 94 108 106",
    handR: [108, 108],
    ...STAND,
    tilt: -5,
    look: [-3, -1],
    mouth: "small",
  },
  jump: {
    armL: "M25 78 Q12 66 6 58",
    handL: [4, 56],
    armR: "M97 78 Q114 66 120 58",
    handR: [122, 56],
    legL: "M51 103 Q40 110 47 118",
    footL: [44, 121],
    legR: "M69 103 Q80 110 73 118",
    footR: [76, 121],
    tilt: 8,
    lift: -16,
    mouth: "open",
    shadow: { rx: 17, opacity: 0.6 },
  },
  excited: {
    armL: "M25 78 Q14 64 13 48",
    handL: [13, 45],
    armR: "M97 78 Q112 64 113 48",
    handR: [113, 45],
    ...STAND,
    eyes: "closed",
    mouth: "open",
  },
  resting: {
    armL: "M25 86 Q12 96 7 109",
    handL: [6, 111],
    armR: "M97 86 Q114 96 119 109",
    handR: [120, 111],
    legL: "M50 116 Q60 138 84 134",
    footL: [88, 134],
    legR: "M70 116 Q60 138 36 135",
    footR: [32, 135],
    sit: 18,
    eyes: "sleepy",
    mouth: "small",
    shadow: { rx: 34, opacity: 1 },
  },
  proud: {
    armL: "M25 80 Q8 92 30 100",
    handL: [31, 100],
    // The coin's edge reaches further right, so this elbow and hand sit wider to stay in view.
    armR: "M95 80 Q125 92 98 100",
    handR: [99, 100],
    ...STAND,
    tilt: -7,
    eyes: "content",
    brows: true,
    mouth: "big",
  },
};
