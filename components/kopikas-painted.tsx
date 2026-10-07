"use client";

import { Fragment } from "react";
import { AnimatePresence, motion, type MotionValue } from "motion/react";
import {
  BROWS,
  COIN,
  COIN_SHAPE,
  CONFETTI,
  EYE_DOTS,
  EYE_STROKE,
  EYES_CLOSED,
  EYES_CONTENT,
  EYES_SLEEPY,
  FACE,
  FOOT,
  HAND_R,
  K,
  LIMB_WIDTH,
  MOUTHS,
  PIVOT,
  SHADOW,
  SHAPES,
  SPARKLE,
  SPARKLE_FILL,
  SPARKLES,
  TONGUE,
  WAVE_MARK,
  WAVE_MARKS,
  type Frame,
  type PaintedPose,
  type Pt,
  type Shape,
} from "@/components/kopikas-figure";

// Kopikas, painted, after the character sheet: a copper coin turned a touch
// so its edge shows, the k on its forehead, a blue face, thick rounded limbs
// with mitten hands. Its shapes and poses are data in kopikas-figure.ts, which
// the Lottie file is built from too; this draws them and moves between them.
export type { PaintedPose };

const LIMB = "var(--painted-limb)";

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
        strokeWidth={LIMB_WIDTH}
        strokeLinecap="round"
        fill="none"
      />
      {foot ? (
        <motion.ellipse initial={false} animate={{ cx: at[0], cy: at[1] }} transition={t} rx={FOOT.rx} ry={FOOT.ry} style={{ fill: LIMB }} />
      ) : (
        <motion.circle
          initial={false}
          animate={play ? { cx: play.map((f) => f[1][0]), cy: play.map((f) => f[1][1]) } : { cx: at[0], cy: at[1] }}
          transition={w}
          r={HAND_R}
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
        <path d={MOUTHS.open.mouth} fill={FACE} />
        <path d={MOUTHS.open.tongue} fill={TONGUE} />
      </>
    );
  const m = MOUTHS[kind];
  return <path d={m.d} stroke={FACE} strokeWidth={m.width} fill="none" strokeLinecap="round" />;
}

export function PaintedKopikas({ pose, ex, ey, reduce }: { pose: PaintedPose; ex: MotionValue<number>; ey: MotionValue<number>; reduce: boolean }) {
  const s = SHAPES[pose];
  const t = reduce ? { duration: 0 } : SPRING;
  const eyes = s.eyes ?? "dots";
  const shadow = s.shadow ?? { rx: SHADOW.rx, opacity: 1 };
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
        cx={SHADOW.cx}
        cy={SHADOW.cy}
        ry={SHADOW.ry}
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
          style={{ transformBox: "view-box", originX: `${PIVOT.x}px`, originY: `${PIVOT.y}px` }}
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
          <circle data-layer="coin-edge" cx={COIN_SHAPE.edge.cx} cy={COIN_SHAPE.edge.cy} r={COIN_SHAPE.edge.r} fill={COIN.edge} />
          <circle data-layer="coin-face" cx={COIN_SHAPE.face.cx} cy={COIN_SHAPE.face.cy} r={COIN_SHAPE.face.r} fill={COIN.body} />
          <circle data-layer="coin-ring" cx={COIN_SHAPE.ring.cx} cy={COIN_SHAPE.ring.cy} r={COIN_SHAPE.ring.r} fill="none" stroke={COIN.ring} strokeWidth={COIN_SHAPE.ring.width} />
          <g data-layer="k">
            {COIN_SHAPE.k.map((k) => (
              <path key={k.fill} d={K} fill={k.fill} transform={`translate(${k.x} ${k.y}) scale(${k.scale})`} />
            ))}
          </g>
        </g>

        <g data-layer="eyes">
        {eyes === "closed" ? (
          EYES_CLOSED.map((d) => <path key={d} d={d} stroke={FACE} strokeWidth={EYE_STROKE} fill="none" strokeLinecap="round" />)
        ) : eyes === "content" ? (
          EYES_CONTENT.map((d) => <path key={d} d={d} stroke={FACE} strokeWidth={EYE_STROKE} fill="none" strokeLinecap="round" />)
        ) : eyes === "sleepy" ? (
          EYES_SLEEPY.map((e) => (
            <Fragment key={e.lid}>
              <path d={e.lid} fill={FACE} />
              <path d={e.line} stroke={FACE} strokeWidth="2.6" strokeLinecap="round" />
            </Fragment>
          ))
        ) : s.look ? (
          <g className="goofy-blink" style={{ animationDelay: "-1.4s" }}>
            {EYE_DOTS.map((e) => (
              <ellipse key={e.cx} cx={e.cx + s.look![0]} cy={e.cy + s.look![1]} rx={e.rx} ry={e.ry} fill={FACE} />
            ))}
          </g>
        ) : (
          <g className="goofy-blink" style={{ animationDelay: "-1.4s" }}>
            {EYE_DOTS.map((e) => (
              <motion.ellipse key={e.cx} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={FACE} style={{ x: ex, y: ey }} />
            ))}
          </g>
        )}
        </g>
        {s.brows && (
          <g data-layer="brows">
            {BROWS.map((d) => (
              <path key={d} d={d} stroke={FACE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            ))}
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
            {WAVE_MARKS.map((d) => (
              <path key={d} d={d} style={{ stroke: LIMB }} strokeWidth={WAVE_MARK.width} fill="none" strokeLinecap="round" opacity={WAVE_MARK.opacity} />
            ))}
          </motion.g>
        )}
        {pose === "excited" && (
          <motion.g key="sparkles" data-layer="sparkles" initial={reduce ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ originX: 0.5, originY: 0.5 }}>
            {SPARKLES.map((sp) => (
              <path key={sp.x} d={SPARKLE} fill={SPARKLE_FILL} transform={`translate(${sp.x} ${sp.y}) scale(${sp.scale})`} />
            ))}
            {CONFETTI.map((c) => (
              <circle key={c.cx} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      </motion.g>
      </motion.g>
    </g>
  );
}
