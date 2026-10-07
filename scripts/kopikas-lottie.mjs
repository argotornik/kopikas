// Builds public/kopikas.lottie: Kopikas's set pieces (hello, jump, excited)
// as Lottie animations, drawn from the same data as the code-drawn figure
// (components/kopikas-figure.ts), with light and dark themes.
//
//   npm run kopikas:lottie
//
// The file can be opened in Lottie Creator to tune timing by eye; rebuilding
// overwrites it, so carry any tuning back into this script.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as F from "../components/kopikas-figure.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/kopikas.lottie");

// The artboard of design/kopikas: 148 by 156 figure units at 4 px each, the
// figure inset by a margin so outstretched hands and sparkles stay inside.
const FPS = 60;
const UNIT = 4;
const PAD = [12, 6];
const W = 148 * UNIT;
const H = 156 * UNIT;

// ---- Colours and the slots the themes fill ----------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4)).concat(1);
const SLOTS = { limb: "limb", face: "face", shadow: "shadow_opacity" };
const THEMES = {
  light: { limb: "#3A2A20", face: F.FACE, shadow: 12 },
  dark: { limb: "#D9C7B4", face: F.FACE, shadow: 35 },
};
const slotDefaults = {
  [SLOTS.limb]: { p: { a: 0, k: rgb(THEMES.light.limb) } },
  [SLOTS.face]: { p: { a: 0, k: rgb(THEMES.light.face) } },
  [SLOTS.shadow]: { p: { a: 0, k: THEMES.light.shadow } },
};
const theme = (t) => ({
  rules: [
    { id: SLOTS.limb, type: "Color", value: rgb(t.limb) },
    { id: SLOTS.face, type: "Color", value: rgb(t.face) },
    { id: SLOTS.shadow, type: "Scalar", value: t.shadow },
  ],
});

// ---- Properties and keyframes --------------------------------------------------

// Each easing is a cubic-bezier(x1, y1, x2, y2) for the stretch after a keyframe.
const EASE = {
  inOut: [0.42, 0, 0.58, 1],
  out: [0.22, 1, 0.36, 1], // fast start, soft landing
  in: [0.55, 0, 0.85, 0.4], // falling
  back: [0.34, 1.56, 0.64, 1], // settles with a small overshoot
  hold: null,
};
const dimsOf = (v) => (Array.isArray(v) ? v.length : 1);
// A property: a plain value, or keyframes [{ t, v, e }] where e eases into the next one.
function prop(spec, map = (v) => v) {
  if (!Array.isArray(spec) || typeof spec[0] !== "object" || spec[0] === null || !("t" in spec[0])) return { a: 0, k: map(spec) };
  return {
    a: 1,
    k: spec.map((key, i) => {
      const v = map(key.v);
      const out = { t: key.t, s: Array.isArray(v) ? v : [v] };
      if (i === spec.length - 1) return out;
      const ease = EASE[key.e ?? "inOut"];
      if (!ease) return { ...out, h: 1 };
      const n = key.shape ? 1 : dimsOf(v);
      const rep = (x) => Array(n).fill(x);
      return { ...out, o: { x: rep(ease[0]), y: rep(ease[1]) }, i: { x: rep(ease[2]), y: rep(ease[3]) } };
    }),
  };
}

// An SVG path (M, L, Q, C, Z) as a Lottie bezier shape. Quadratic curves become
// cubic ones, so every limb is two vertices and any two poses can morph.
function shape(d) {
  const nums = d.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const v = [];
  const ins = [];
  const outs = [];
  let closed = false;
  let i = 0;
  let cur = [0, 0];
  const num = () => +nums[i++];
  const pt = () => [num(), num()];
  const sub = (a, b) => [+(a[0] - b[0]).toFixed(3), +(a[1] - b[1]).toFixed(3)];
  while (i < nums.length) {
    const cmd = nums[i++];
    if (cmd === "M" || cmd === "L") {
      cur = pt();
      v.push(cur);
      ins.push([0, 0]);
      outs.push([0, 0]);
    } else if (cmd === "Q") {
      const c = pt();
      const end = pt();
      const c1 = [cur[0] + (2 / 3) * (c[0] - cur[0]), cur[1] + (2 / 3) * (c[1] - cur[1])];
      const c2 = [end[0] + (2 / 3) * (c[0] - end[0]), end[1] + (2 / 3) * (c[1] - end[1])];
      outs[outs.length - 1] = sub(c1, cur);
      v.push(end);
      ins.push(sub(c2, end));
      outs.push([0, 0]);
      cur = end;
    } else if (cmd === "C") {
      const c1 = pt();
      const c2 = pt();
      const end = pt();
      outs[outs.length - 1] = sub(c1, cur);
      v.push(end);
      ins.push(sub(c2, end));
      outs.push([0, 0]);
      cur = end;
    } else if (cmd === "Z" || cmd === "z") {
      closed = true;
    } else throw new Error(`kopikas-lottie: unsupported path command ${cmd} in ${d}`);
  }
  // A closed path that returns to its start ends on a duplicate vertex: fold it in.
  const last = v.length - 1;
  if (closed && last > 0 && Math.hypot(v[last][0] - v[0][0], v[last][1] - v[0][1]) < 1e-6) {
    ins[0] = ins[last];
    v.pop();
    ins.pop();
    outs.pop();
  }
  return { c: closed, v, i: ins, o: outs };
}
// The k sits on the coin through a translate and a scale; bake them in.
function placed(s, x, y, k) {
  return { ...s, v: s.v.map(([a, b]) => [+(x + a * k).toFixed(3), +(y + b * k).toFixed(3)]), i: s.i.map(([a, b]) => [a * k, b * k]), o: s.o.map(([a, b]) => [a * k, b * k]) };
}

// ---- Shapes ---------------------------------------------------------------------

const tr = ({ a = [0, 0], p = a, s = [100, 100], r = 0, o = 100 } = {}) => ({
  ty: "tr",
  a: prop(a),
  p: prop(p),
  s: prop(s),
  r: prop(r),
  o: prop(o),
  sk: prop(0),
  sa: prop(0),
});
const group = (nm, items, t) => ({ ty: "gr", nm, it: [...items, t ?? tr()] });
const path = (spec) => ({ ty: "sh", ks: prop(spec, shape) });
const ellipse = (p, size) => ({ ty: "el", p: prop(p), s: prop(size) });
const colour = (c, sid) => (sid ? { a: 0, k: rgb(c), sid } : { a: 0, k: rgb(c) });
// A slot on the colour (sid) or on the opacity (oSid) lets the themes change it.
const fill = (c, { sid, oSid, o = 100 } = {}) => ({ ty: "fl", c: colour(c, sid), o: oSid ? { a: 0, k: o, sid: oSid } : prop(o), r: 1 });
const stroke = (c, w, { sid, o = 100 } = {}) => ({ ty: "st", c: colour(c, sid), o: prop(o), w: prop(w), lc: 2, lj: 2, ml: 4 });
// Path keyframes carry one dimension of easing whatever the shape.
const shapeKeys = (keys) => (Array.isArray(keys) ? keys.map((k) => ({ ...k, shape: true })) : keys);

// ---- Layers ---------------------------------------------------------------------

function composition(name, frames, build) {
  const layers = [];
  let ind = 0;
  const base = (nm, ty, parent, ks) => {
    const layer = { ddd: 0, ind: ++ind, ty, nm, sr: 1, ks, ao: 0, ip: 0, op: frames, st: 0, bm: 0 };
    if (parent) layer.parent = parent;
    layers.push(layer);
    return layer.ind;
  };
  const ks = ({ a = [0, 0], p = a, s = [100, 100], r = 0, o = 100 } = {}) => ({
    a: prop(a, (v) => [...v, 0]),
    p: prop(p, (v) => [...v, 0]),
    s: prop(s, (v) => [...v, 100]),
    r: prop(r),
    o: prop(o),
  });
  const api = {
    null: (nm, parent, t) => base(nm, 3, parent, ks(t)),
    shapes: (nm, parent, shapes, t) => {
      const i = base(nm, 4, parent, ks(t));
      layers[layers.length - 1].shapes = shapes;
      return i;
    },
  };
  build(api);
  // Lottie draws the first layer on top; these were added bottom first.
  return { v: "5.12.0", fr: FPS, ip: 0, op: frames, w: W, h: H, nm: name, ddd: 0, assets: [], layers: layers.reverse(), slots: slotDefaults, markers: [] };
}

const LIMB_C = "#3A2A20";
// An arm or a leg: one curve and a mitten hand or a foot, each optionally keyframed.
function limb(api, nm, parent, d, at, foot = false) {
  const end = foot ? ellipse(at, [F.FOOT.rx * 2, F.FOOT.ry * 2]) : ellipse(at, [F.HAND_R * 2, F.HAND_R * 2]);
  return api.shapes(nm, parent, [
    group("hand", [end, fill(LIMB_C, { sid: SLOTS.limb })]),
    group("curve", [path(shapeKeys(d)), stroke(LIMB_C, F.LIMB_WIDTH, { sid: SLOTS.limb })]),
  ]);
}

// The whole figure, with every moving part a keyframe track:
//   lift (figure off the ground), squash (scale from the feet), tilt (lean
//   about the coin's centre), arms, legs, shadow, blink, and extras on top.
function figure(api, m) {
  const root = api.null("kopikas", 0, { a: [0, 0], p: [PAD[0] * UNIT, PAD[1] * UNIT], s: [UNIT * 100, UNIT * 100] });
  api.shapes("shadow", root, [group("shadow", [ellipse([F.SHADOW.cx, F.SHADOW.cy], m.shadow), fill("#000000", { oSid: SLOTS.shadow, o: THEMES.light.shadow })])], { o: m.shadowO ?? 100 });
  const lift = api.null("lift", root, { p: m.lift });
  const squash = api.null("squash", lift, { a: [60, 135], s: m.squash });
  limb(api, "leg-left", squash, m.legL, m.footL, true);
  limb(api, "leg-right", squash, m.legR, m.footR, true);
  const body = api.null("body", squash);
  const tilt = api.null("tilt", body, { a: [F.PIVOT.x, F.PIVOT.y], r: m.tilt });
  limb(api, "arm-left", tilt, m.armL, m.handL);
  limb(api, "arm-right", tilt, m.armR, m.handR);
  const c = F.COIN_SHAPE;
  api.shapes("coin", tilt, [
    group(
      "k",
      c.k
        .slice()
        .reverse()
        .map((k, i) => group(`k-${i}`, [{ ty: "sh", ks: prop(placed(shape(F.K), k.x, k.y, k.scale)) }, fill(k.fill)])),
    ),
    group("coin-ring", [ellipse([c.ring.cx, c.ring.cy], [c.ring.r * 2, c.ring.r * 2]), stroke(F.COIN.ring, c.ring.width)]),
    group("coin-face", [ellipse([c.face.cx, c.face.cy], [c.face.r * 2, c.face.r * 2]), fill(F.COIN.body)]),
    group("coin-edge", [ellipse([c.edge.cx, c.edge.cy], [c.edge.r * 2, c.edge.r * 2]), fill(F.COIN.edge)]),
  ]);
  // Eyes: dots that blink (squash shut about their centre), or closed in joy.
  const eyes =
    m.eyes === "closed"
      ? F.EYES_CLOSED.map((d, i) => group(`eye-${i}`, [path(d), stroke(F.FACE, F.EYE_STROKE, { sid: SLOTS.face })]))
      : F.EYE_DOTS.map((e, i) =>
          group(`eye-${i}`, [ellipse([e.cx, e.cy], [e.rx * 2, e.ry * 2]), fill(F.FACE, { sid: SLOTS.face })], tr({ a: [e.cx, e.cy], s: m.blink ?? [100, 100] })),
        );
  api.shapes("eyes", tilt, eyes);
  api.shapes("mouth", tilt, [
    group("tongue", [path(F.MOUTHS.open.tongue), fill(F.TONGUE)]),
    group("mouth", [path(F.MOUTHS.open.mouth), fill(F.FACE, { sid: SLOTS.face })]),
  ]);
  m.extras?.(api, lift);
}

// ---- The animations ------------------------------------------------------------

// Shared shapes between the poses' own: arms hanging, and the in-betweens.
const S = F.SHAPES;
const HANG = { armL: S.friendly.armL, handL: S.friendly.handL, armR: S.budgeting.armR, handR: S.budgeting.handR };
const SWING = { armL: "M25 82 Q12 92 9 102", handL: [8, 104], armR: "M97 82 Q114 92 117 102", handR: [118, 104] };
const PUMP = { armL: "M25 80 Q12 72 16 60", handL: [16, 57], armR: "M97 80 Q114 72 110 60", handR: [110, 57] };
const keys = (...ks) => ks.map(([t, v, e]) => ({ t, v, e }));
const shadowW = (rx) => [rx * 2, F.SHADOW.ry * 2];

// Hello, on arrival: crouched, it pops up leaning in, opens one arm wide, waves
// the other twice and settles smiling. Plays once and holds the hello pose.
const hello = composition("hello", 96, (api) =>
  figure(api, {
    lift: keys([0, [0, 0], "out"], [12, [0, -8], "in"], [22, [0, 0]]),
    squash: keys([0, [112, 86], "out"], [10, [94, 108], "inOut"], [22, [106, 94], "back"], [32, [100, 100]]),
    tilt: keys([6, 0, "out"], [24, 6.5, "inOut"], [34, S.hello.tilt]),
    shadow: keys([0, shadowW(29)], [12, shadowW(23), "in"], [22, shadowW(29), "back"], [32, shadowW(F.SHADOW.rx)]),
    shadowO: keys([0, 100], [12, 80], [22, 100]),
    legL: S.hello.legL,
    footL: S.hello.footL,
    legR: S.hello.legR,
    footR: S.hello.footR,
    armL: keys([4, HANG.armL, "out"], [18, F.HELLO_L[0][0]], [30, F.HELLO_L[1][0]], [42, F.HELLO_L[0][0]], [54, F.HELLO_L[1][0]], [66, F.HELLO_L[0][0]]),
    handL: keys([4, HANG.handL, "out"], [18, F.HELLO_L[0][1]], [30, F.HELLO_L[1][1]], [42, F.HELLO_L[0][1]], [54, F.HELLO_L[1][1]], [66, F.HELLO_L[0][1]]),
    armR: keys([6, HANG.armR, "back"], [24, S.hello.armR]),
    handR: keys([6, HANG.handR, "back"], [24, S.hello.handR]),
    blink: keys([78, [100, 100]], [81, [100, 10]], [86, [100, 100]]),
    extras: (api, parent) =>
      api.shapes(
        "wave-marks",
        parent,
        F.WAVE_MARKS.map((d, i) => group(`mark-${i}`, [path(d), stroke(LIMB_C, F.WAVE_MARK.width, { sid: SLOTS.limb, o: F.WAVE_MARK.opacity * 100 })])),
        { o: keys([18, 0], [26, 100]) },
      ),
  }),
);

// Jump, when a coin lands in its roll: it crouches, springs up tucking its
// legs, lands with a squash and wobbles still. Plays once and holds standing.
const jump = composition("jump", 54, (api) =>
  figure(api, {
    lift: keys([8, [0, 0], "out"], [22, [0, -26], "in"], [36, [0, 0]]),
    squash: keys([0, [100, 100], "out"], [8, [114, 84], "out"], [13, [90, 112], "inOut"], [22, [100, 100], "hold"], [36, [100, 100], "out"], [39, [112, 88], "back"], [50, [100, 100]]),
    tilt: keys([10, 0, "out"], [22, S.jump.tilt, "inOut"], [36, 6, "out"], [42, -3, "inOut"], [48, 1.5, "inOut"], [54, 0]),
    shadow: keys([0, shadowW(F.SHADOW.rx)], [8, shadowW(30), "out"], [22, shadowW(S.jump.shadow.rx), "in"], [36, shadowW(F.SHADOW.rx)], [39, shadowW(31), "back"], [50, shadowW(F.SHADOW.rx)]),
    // Higher than the still jump pose, so a touch fainter than its 60 %.
    shadowO: keys([8, 100, "out"], [22, 50, "in"], [36, 100]),
    legL: keys([10, F.STAND.legL, "out"], [18, S.jump.legL, "inOut"], [30, S.jump.legL, "out"], [36, F.STAND.legL]),
    footL: keys([10, F.STAND.footL, "out"], [18, S.jump.footL, "inOut"], [30, S.jump.footL, "out"], [36, F.STAND.footL]),
    legR: keys([10, F.STAND.legR, "out"], [18, S.jump.legR, "inOut"], [30, S.jump.legR, "out"], [36, F.STAND.legR]),
    footR: keys([10, F.STAND.footR, "out"], [18, S.jump.footR, "inOut"], [30, S.jump.footR, "out"], [36, F.STAND.footR]),
    armL: keys([0, HANG.armL, "inOut"], [8, SWING.armL, "out"], [16, S.jump.armL, "inOut"], [36, S.jump.armL, "out"], [50, HANG.armL]),
    handL: keys([0, HANG.handL, "inOut"], [8, SWING.handL, "out"], [16, S.jump.handL, "inOut"], [36, S.jump.handL, "out"], [50, HANG.handL]),
    armR: keys([0, HANG.armR, "inOut"], [8, SWING.armR, "out"], [16, S.jump.armR, "inOut"], [36, S.jump.armR, "out"], [50, HANG.armR]),
    handR: keys([0, HANG.handR, "inOut"], [8, SWING.handR, "out"], [16, S.jump.handR, "inOut"], [36, S.jump.handR, "out"], [50, HANG.handR]),
    blink: keys([36, [100, 100]], [39, [100, 30]], [44, [100, 100]]),
  }),
);

// Excited, when everything is sorted: eyes shut with joy, it hops with its
// arms pumping while the sparkles twinkle. Loops; the first frame is the last.
const excited = composition("excited", 72, (api) =>
  figure(api, {
    eyes: "closed",
    lift: keys([8, [0, 0], "out"], [22, [0, -12], "in"], [36, [0, 0]]),
    squash: keys([0, [100, 100], "out"], [8, [110, 90], "out"], [14, [94, 107], "inOut"], [22, [100, 100], "hold"], [36, [100, 100], "out"], [40, [108, 92], "back"], [50, [100, 100]]),
    tilt: keys([0, 0, "inOut"], [22, 3, "inOut"], [48, -3, "inOut"], [72, 0]),
    shadow: keys([0, shadowW(F.SHADOW.rx)], [8, shadowW(30), "out"], [22, shadowW(22), "in"], [36, shadowW(F.SHADOW.rx)], [40, shadowW(29), "back"], [50, shadowW(F.SHADOW.rx)]),
    shadowO: keys([8, 100, "out"], [22, 78, "in"], [36, 100]),
    legL: S.excited.legL,
    footL: S.excited.footL,
    legR: S.excited.legR,
    footR: S.excited.footR,
    armL: keys([0, S.excited.armL, "inOut"], [8, PUMP.armL, "out"], [18, S.excited.armL, "inOut"], [54, S.excited.armL, "inOut"], [60, PUMP.armL, "out"], [68, S.excited.armL], [72, S.excited.armL]),
    handL: keys([0, S.excited.handL, "inOut"], [8, PUMP.handL, "out"], [18, S.excited.handL, "inOut"], [54, S.excited.handL, "inOut"], [60, PUMP.handL, "out"], [68, S.excited.handL], [72, S.excited.handL]),
    armR: keys([0, S.excited.armR, "inOut"], [8, PUMP.armR, "out"], [18, S.excited.armR, "inOut"], [54, S.excited.armR, "inOut"], [60, PUMP.armR, "out"], [68, S.excited.armR], [72, S.excited.armR]),
    handR: keys([0, S.excited.handR, "inOut"], [8, PUMP.handR, "out"], [18, S.excited.handR, "inOut"], [54, S.excited.handR, "inOut"], [60, PUMP.handR, "out"], [68, S.excited.handR], [72, S.excited.handR]),
    extras: (api, parent) => {
      // Each sparkle twinkles on its own beat; the confetti bobs.
      api.shapes(
        "sparkles",
        parent,
        [
          ...F.CONFETTI.map((c, i) =>
            group(`confetti-${i}`, [ellipse([c.cx, c.cy], [c.r * 2, c.r * 2]), fill(c.fill)], tr({ p: keys([0, [0, 0], "inOut"], [36, [0, i ? 3 : -3], "inOut"], [72, [0, 0]]) })),
          ),
          ...F.SPARKLES.map((sp, i) =>
            group(
              `sparkle-${i}`,
              [{ ty: "sh", ks: prop(placed(shape(F.SPARKLE), sp.x, sp.y, sp.scale)) }, fill(F.SPARKLE_FILL)],
              tr({ a: [sp.x, sp.y], s: keys([0, [100, 100], "inOut"], [12 + i * 14, [100, 100], "inOut"], [24 + i * 14, [50, 50], "inOut"], [36 + i * 14, [100, 100], "inOut"], [72, [100, 100]]) }),
            ),
          ),
        ],
      );
    },
  }),
);

// ---- Timing --------------------------------------------------------------------

// Each animation's timing, as [frame as choreographed, frame played] pairs at
// its phase boundaries. The moves stay the same; the stretches between pairs
// speed up or slow down, and the last pair sets the length. Pairs that match
// play an animation as choreographed above.
//   hello    quicker (1.2 s): it plays as the page opens, so it greets and gets out of the way
//   jump     as choreographed (0.9 s): it answers a tap and already reads crisp
//   excited  softer (1.8 s a hop, a rest between): it loops while everything is sorted
export const TIMING = {
  hello: [[0, 0], [10, 7], [22, 16], [34, 25], [66, 52], [96, 72]],
  jump: [[0, 0], [54, 54]],
  excited: [[0, 0], [48, 72], [72, 108]],
};

// An animation with every keyframe moved through the timing's pairs.
function retime(json, pairs) {
  const at = (t) => {
    let i = 1;
    while (i < pairs.length - 1 && t > pairs[i][0]) i++;
    const [a0, b0] = pairs[i - 1];
    const [a1, b1] = pairs[i];
    return +(b0 + ((t - a0) * (b1 - b0)) / (a1 - a0)).toFixed(2);
  };
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v.k) && typeof v.k[0] === "object" && v.k[0] !== null && "t" in v.k[0]) for (const key of v.k) key.t = at(key.t);
    Object.values(v).forEach(walk);
  };
  const out = structuredClone(json);
  walk(out.layers);
  out.op = Math.round(at(out.op));
  for (const layer of out.layers) layer.op = out.op;
  return out;
}

// ---- The .lottie file ----------------------------------------------------------

const ANIMATIONS = { hello, jump, excited };

export function buildLottie(out = OUT, timing = TIMING) {
  const dir = mkdtempSync(join(tmpdir(), "kopikas-lottie-"));
  mkdirSync(join(dir, "a"));
  mkdirSync(join(dir, "t"));
  for (const [id, json] of Object.entries(ANIMATIONS)) writeFileSync(join(dir, "a", `${id}.json`), JSON.stringify(retime(json, timing[id])));
  for (const [id, t] of Object.entries(THEMES)) writeFileSync(join(dir, "t", `${id}.json`), JSON.stringify(theme(t)));
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      version: "2",
      generator: "scripts/kopikas-lottie.mjs",
      animations: Object.keys(ANIMATIONS).map((id) => ({ id })),
      themes: Object.keys(THEMES).map((id) => ({ id })),
    }),
  );
  rmSync(out, { force: true });
  execFileSync("zip", ["-q", "-X", "-D", "-r", out, "manifest.json", "a", "t"], { cwd: dir });
  rmSync(dir, { recursive: true, force: true });
  return out;
}

// Built when run (npm run kopikas:lottie); importable for trying other timings.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildLottie();
  console.log(`wrote ${OUT.replace(ROOT + "/", "")}: ${Object.keys(ANIMATIONS).join(", ")}; themes ${Object.keys(THEMES).join(", ")}`);
}
