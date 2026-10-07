"use client";

import { AnimatePresence, motion, type MotionValue } from "motion/react";

// Kopikas, painted, after the character sheet: a copper coin turned a touch
// so its edge shows, the k on its forehead, a blue face, thick rounded limbs
// with mitten hands. Each pose belongs to one moment of the product, so the
// coin always says what is going on:
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

const COIN = { body: "#CB793E", edge: "#A45A2B", ring: "#E39C63", k: "#7C3F1D", kLight: "#EFB07C" };
const FACE = "#4C6FE0";
const TONGUE = "#F07A8C";
const LIMB = "var(--painted-limb)";
const K =
  "M11.18 23.6 L11.18 8.59 L14.16 8.59 L14.16 16.92 Q14.81 16.48 15.41 15.96 Q16.01 15.45 16.51 14.88 Q17.0 14.32 17.38 13.73 Q17.77 13.14 18.05 12.58 L21.51 12.58 Q21.2 13.37 20.69 14.18 Q20.17 14.99 19.47 15.68 Q18.76 16.36 17.84 16.84 Q16.91 17.32 15.8 17.49 L15.8 17.85 Q17.21 17.59 18.13 17.88 Q19.06 18.18 19.66 18.82 Q20.25 19.46 20.61 20.29 Q20.97 21.12 21.26 21.96 L21.74 23.6 L18.45 23.6 L18.17 22.57 Q17.88 21.54 17.52 20.77 Q17.17 19.99 16.59 19.56 Q16.01 19.13 15.0 19.13 L14.16 19.13 L14.16 23.6 L11.18 23.6 Z";

type Pt = [number, number];
type Frame = [string, Pt];
// Every limb is one quadratic curve, so poses blend into each other.
type Shape = {
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
const STAND = { legL: "M51 103 Q50 116 49 127", footL: [46, 130] as Pt, legR: "M69 103 Q70 116 71 127", footR: [74, 130] as Pt };
// Arrival: one arm up and waving, the other open wide. Hover: one small hand lift.
const HELLO_L: Frame[] = [["M25 78 Q12 62 14 46", [14, 43]], ["M25 78 Q9 64 7 50", [7, 47]]];
const HOVER_R: Frame[] = [["M97 80 Q110 74 110 64", [110, 61]], ["M97 80 Q113 76 115 67", [115, 64]]];

const SHAPES: Record<PaintedPose, Shape> = {
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

const SPRING = { type: "spring" as const, stiffness: 220, damping: 20 };

function Limb({ name, d, at, reduce, foot = false, frames, repeat = false }: { name: string; d: string; at: Pt; reduce: boolean; foot?: boolean; frames?: Frame[]; repeat?: boolean }) {
  const t = reduce ? { duration: 0 } : SPRING;
  // A gesture goes there and back twice, ending where it started.
  const play = frames && !reduce ? [frames[0], frames[1], frames[0], frames[1], frames[0]] : null;
  const w = play ? { duration: 1.5, repeat: repeat ? Infinity : 0, ease: "easeInOut" as const } : t;
  return (
    <g data-layer={name}>
      <motion.path
        initial={false}
        animate={{ d: play ? play.map((f) => f[0]) : d }}
        transition={w}
        style={{ stroke: LIMB }}
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
      {foot ? (
        <motion.ellipse initial={false} animate={{ cx: at[0], cy: at[1] }} transition={t} rx="9.5" ry="5" style={{ fill: LIMB }} />
      ) : (
        <motion.circle
          initial={false}
          animate={play ? { cx: play.map((f) => f[1][0]), cy: play.map((f) => f[1][1]) } : { cx: at[0], cy: at[1] }}
          transition={w}
          r="6"
          style={{ fill: LIMB }}
        />
      )}
    </g>
  );
}

// The checklist Kopikas holds up by its face while you file.
function Checklist() {
  return (
    <g transform="rotate(-6 8 62)">
      <rect x="-8" y="42" width="31" height="40" rx="3" fill="#FAF7F0" stroke="#D8D2C6" strokeWidth="1" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="-3.5" y={48 + i * 8} width="4.6" height="4.6" rx="0.8" fill="none" stroke={FACE} strokeWidth="1.2" />
          {i < 2 && <path d={`M-2.7 ${50.4 + i * 8} l1.4 1.4 2.6-3`} stroke={FACE} strokeWidth="1.3" fill="none" strokeLinecap="round" />}
          <path d={`M4 ${50.4 + i * 8} H${i % 2 ? 14 : 18}`} stroke="#A7A196" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

// The loose coin Kopikas holds up to show you while there is change to file.
function HeldCoin() {
  return (
    <g>
      <circle cx="62.5" cy="96.5" r="10" fill="#B88A1E" />
      <circle cx="60" cy="95" r="10" fill="#E8B93C" />
      <circle cx="60" cy="95" r="7" fill="none" stroke="#FBE08A" strokeWidth="1.4" />
      <path d="M77 79.8 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#F2B585" />
    </g>
  );
}

function Mouth({ kind }: { kind: NonNullable<Shape["mouth"]> }) {
  if (kind === "open")
    return (
      <>
        <path d="M46 75 Q60 94 74 74 Z" fill={FACE} />
        <path d="M52 83.5 Q60 90 68 83 Q60 79 52 83.5 Z" fill={TONGUE} />
      </>
    );
  if (kind === "small") return <path d="M53 78 Q60 83 67 77.6" stroke={FACE} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
  if (kind === "big") return <path d="M45 74 Q60 92 75 73" stroke={FACE} strokeWidth="4" fill="none" strokeLinecap="round" />;
  return <path d="M47 76 Q60 89 73 75" stroke={FACE} strokeWidth="3.6" fill="none" strokeLinecap="round" />;
}

const SPARKLE = "M0 -6 C0.6 -1.6 1.6 -0.6 6 0 C1.6 0.6 0.6 1.6 0 6 C-0.6 1.6 -1.6 0.6 -6 0 C-1.6 -0.6 -0.6 -1.6 0 -6Z";

export function PaintedKopikas({ pose, ex, ey, reduce }: { pose: PaintedPose; ex: MotionValue<number>; ey: MotionValue<number>; reduce: boolean }) {
  const s = SHAPES[pose];
  const t = reduce ? { duration: 0 } : SPRING;
  const eyes = s.eyes ?? "dots";
  const shadow = s.shadow ?? { rx: 27, opacity: 1 };
  const arms = (
    <>
      <Limb name="arm-left" d={s.armL} at={s.handL} reduce={reduce} frames={s.wave?.l} repeat={s.wave?.repeat} />
      <Limb name="arm-right" d={s.armR} at={s.handR} reduce={reduce} frames={s.wave?.r} repeat={s.wave?.repeat} />
    </>
  );
  const legs = (
    <>
      <Limb name="leg-left" d={s.legL} at={s.footL} reduce={reduce} foot />
      <Limb name="leg-right" d={s.legR} at={s.footR} reduce={reduce} foot />
    </>
  );
  const bounce =
    reduce ? { y: 0 } : pose === "jump" ? { y: [0, -10, 0, -6, 0] } : pose === "excited" ? { y: [0, -6, 0] } : { y: 0 };
  const bounceT = pose === "excited" ? { duration: 0.7, repeat: Infinity, repeatDelay: 0.4 } : { duration: 0.9 };

  return (
    <g>
      <motion.ellipse
        data-layer="shadow"
        cx="60"
        cy="134"
        ry="4.2"
        initial={false}
        animate={{ rx: shadow.rx, opacity: shadow.opacity }}
        transition={t}
        style={{ fill: "var(--painted-shadow)" }}
      />
      <motion.g initial={false} animate={{ y: s.lift ?? 0 }} transition={t}>
      <motion.g animate={bounce} transition={bounceT}>
      {legs}

      <motion.g data-layer="body" initial={false} animate={{ y: s.sit ?? 0 }} transition={t}>
        {/* The whole body leans about the coin's centre. */}
        <motion.g
          data-layer="tilt"
          initial={false}
          animate={{ rotate: s.tilt ?? 0 }}
          transition={t}
          style={{ transformBox: "view-box", originX: "60px", originY: "74px" }}
        >
        {/* The checklist sits behind the arm, so the hand holds it from the front. */}
        <AnimatePresence>
          {pose === "budgeting" && (
            <motion.g key="list" data-layer="prop-checklist" initial={reduce ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <Checklist />
            </motion.g>
          )}
        </AnimatePresence>
        {!s.armsFront && arms}
        {/* The coin, its edge showing below and to the right. */}
        <g data-layer="coin">
          <circle data-layer="coin-edge" cx="66" cy="74" r="37" fill={COIN.edge} />
          <circle data-layer="coin-face" cx="60" cy="70" r="37" fill={COIN.body} />
          <circle data-layer="coin-ring" cx="60" cy="70" r="31" fill="none" stroke={COIN.ring} strokeWidth="1.8" />
          <g data-layer="k">
            <path d={K} fill={COIN.kLight} transform="translate(48.6 32.4) scale(0.72)" />
            <path d={K} fill={COIN.k} transform="translate(48.15 31.7) scale(0.72)" />
          </g>
        </g>

        <g data-layer="eyes">
        {eyes === "closed" ? (
          <>
            <path d="M44 63 Q49 57 54 63" stroke={FACE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M66 62 Q71 56 76 62" stroke={FACE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </>
        ) : eyes === "content" ? (
          <>
            <path d="M44 60.5 Q49 65.5 54 60.5" stroke={FACE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M66 60 Q71 65 76 60" stroke={FACE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </>
        ) : eyes === "sleepy" ? (
          <>
            <path d="M44.6 63 A4.4 3.2 0 0 0 53.4 63 Z" fill={FACE} />
            <path d="M43.8 62.8 L54.2 62.8" stroke={FACE} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M66.6 62.4 A4.2 3.1 0 0 0 75.4 62.4 Z" fill={FACE} />
            <path d="M65.8 62.2 L76.2 62.2" stroke={FACE} strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : s.look ? (
          <g className="goofy-blink" style={{ animationDelay: "-1.4s" }}>
            <ellipse cx={49 + s.look[0]} cy={63 + s.look[1]} rx="4.2" ry="5" fill={FACE} />
            <ellipse cx={71 + s.look[0]} cy={62.4 + s.look[1]} rx="4" ry="4.8" fill={FACE} />
          </g>
        ) : (
          <g className="goofy-blink" style={{ animationDelay: "-1.4s" }}>
            <motion.ellipse cx="49" cy="63" rx="4.2" ry="5" fill={FACE} style={{ x: ex, y: ey }} />
            <motion.ellipse cx="71" cy="62.4" rx="4" ry="4.8" fill={FACE} style={{ x: ex, y: ey }} />
          </g>
        )}
        </g>
        {s.brows && (
          <g data-layer="brows">
            <path d="M45 52 Q49 48.5 53 50.5" stroke={FACE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M67 51 Q71 47.5 75 49.5" stroke={FACE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
        )}
        <g data-layer="mouth">
          <Mouth kind={s.mouth ?? "smile"} />
        </g>

        {s.armsFront && arms}
        <AnimatePresence>
          {pose === "saving" && (
            <motion.g key="coin" data-layer="prop-coin" initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ originX: 0.5, originY: 0.5 }}>
              <HeldCoin />
            </motion.g>
          )}
        </AnimatePresence>
        </motion.g>
      </motion.g>

      <AnimatePresence>
        {pose === "hello" && (
          <motion.g key="marks" data-layer="wave-marks" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <path d="M1 33 Q-3 40 0 47" style={{ stroke: LIMB }} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".45" />
            <path d="M25 31 Q30 38 26 45" style={{ stroke: LIMB }} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".45" />
          </motion.g>
        )}
        {pose === "excited" && (
          <motion.g key="sparkles" data-layer="sparkles" initial={reduce ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ originX: 0.5, originY: 0.5 }}>
            <path d={SPARKLE} fill="#F2B585" transform="translate(104 26) scale(1.1)" />
            <path d={SPARKLE} fill="#F2B585" transform="translate(124 30) scale(0.6)" />
            <path d={SPARKLE} fill="#F2B585" transform="translate(12 94) scale(0.9)" />
            <circle cx="24" cy="30" r="2.4" fill="#E2553B" />
            <circle cx="110" cy="96" r="2" fill="#5B7FE0" />
          </motion.g>
        )}
      </AnimatePresence>
      </motion.g>
      </motion.g>
    </g>
  );
}
