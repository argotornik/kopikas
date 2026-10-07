// Builds public/kopikas.lottie: Kopikas's eight poses as Lottie animations,
// drawn from the same data as the code-drawn figure
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

// An SVG path (M, L, H, V, Q, C, Z, absolute or relative) as a Lottie bezier
// shape. Quadratic curves become cubic ones, so every limb is two vertices and
// any two poses can morph.
function shape(d) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const v = [];
  const ins = [];
  const outs = [];
  let closed = false;
  let i = 0;
  let cmd = null;
  let cur = [0, 0];
  const r3 = (n) => +n.toFixed(3);
  const num = () => +tokens[i++];
  const sub = (a, b) => [r3(a[0] - b[0]), r3(a[1] - b[1])];
  const to = (p, inT = [0, 0]) => {
    cur = [r3(p[0]), r3(p[1])];
    v.push(cur);
    ins.push(inT);
    outs.push([0, 0]);
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd || cmd === "Z" || cmd === "z") throw new Error(`kopikas-lottie: stray number in ${d}`);
    const rel = cmd === cmd.toLowerCase();
    const from = cur;
    const pt = () => {
      const x = num();
      const y = num();
      return rel ? [from[0] + x, from[1] + y] : [x, y];
    };
    switch (cmd.toUpperCase()) {
      case "M":
        to(pt());
        cmd = rel ? "l" : "L"; // more pairs after a move draw lines
        break;
      case "L":
        to(pt());
        break;
      case "H": {
        const x = num();
        to([rel ? from[0] + x : x, from[1]]);
        break;
      }
      case "V": {
        const y = num();
        to([from[0], rel ? from[1] + y : y]);
        break;
      }
      case "Q": {
        const c = pt();
        const end = pt();
        outs[outs.length - 1] = sub([from[0] + (2 / 3) * (c[0] - from[0]), from[1] + (2 / 3) * (c[1] - from[1])], from);
        to(end, sub([end[0] + (2 / 3) * (c[0] - end[0]), end[1] + (2 / 3) * (c[1] - end[1])], end));
        break;
      }
      case "C": {
        const c1 = pt();
        const c2 = pt();
        const end = pt();
        outs[outs.length - 1] = sub(c1, from);
        to(end, sub(c2, end));
        break;
      }
      case "Z":
        closed = true;
        break;
      default:
        throw new Error(`kopikas-lottie: unsupported path command ${cmd} in ${d}`);
    }
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

// A rounded rectangle, by its box; and a trim that draws a stroke on gradually.
const rect = (x, y, w, h, r) => ({ ty: "rc", p: prop([x + w / 2, y + h / 2]), s: prop([w, h]), r: prop(r) });
const trim = (end) => ({ ty: "tm", s: prop(0), e: prop(end), o: prop(0), m: 1 });
// A position offset by a static or keyframed [dx, dy].
const offset = (spec, [x, y]) => (Array.isArray(spec) && typeof spec[0] === "object" ? spec.map((k) => ({ ...k, v: [x + k.v[0], y + k.v[1]] })) : [x + spec[0], y + spec[1]]);

// The eyes: dots that blink (and may look at a prop), closed in joy, closed
// contentedly, or sleepy under heavy lids. A list of kinds crossfades them.
function eyes(m) {
  const face = { sid: SLOTS.face };
  const one = (kind) => {
    if (kind === "closed" || kind === "content")
      return (kind === "closed" ? F.EYES_CLOSED : F.EYES_CONTENT).map((d, i) => group(`eye-${i}`, [path(d), stroke(F.FACE, F.EYE_STROKE, face)]));
    if (kind === "sleepy")
      return F.EYES_SLEEPY.map((e, i) =>
        group(`eye-${i}`, [
          group("line", [path(e.line), stroke(F.FACE, F.LINE_STROKE, face)]),
          group("lid", [path(e.lid), fill(F.FACE, face)], tr({ a: [e.cx, e.cy], s: m.lids ?? [100, 100] })),
        ]),
      );
    return F.EYE_DOTS.map((e, i) =>
      group(`eye-${i}`, [ellipse(m.look ? offset(m.look, [e.cx, e.cy]) : [e.cx, e.cy], [e.rx * 2, e.ry * 2]), fill(F.FACE, face)], tr({ a: [e.cx, e.cy], s: m.blink ?? [100, 100] })),
    );
  };
  if (!Array.isArray(m.eyes)) return one(m.eyes ?? "dots");
  return m.eyes.map(({ kind, o }) => group(`eyes-${kind}`, one(kind), tr({ o })));
}

// The mouth: open with its tongue, a named stroke, or a stroke that morphs.
function mouth(spec = "open") {
  const face = { sid: SLOTS.face };
  if (spec === "open") return [group("tongue", [path(F.MOUTHS.open.tongue), fill(F.TONGUE)]), group("mouth", [path(F.MOUTHS.open.mouth), fill(F.FACE, face)])];
  const { d, width } = typeof spec === "string" ? F.MOUTHS[spec] : spec;
  return [group("mouth", [path(shapeKeys(d)), stroke(F.FACE, width, face)])];
}

// The checklist, behind the arm that holds it; it can nod, and one row's tick can draw itself.
function checklist(api, parent, spec) {
  const c = F.CHECKLIST;
  const face = { sid: SLOTS.face };
  const rows = c.rows.map((row, i) => {
    const tickMark = (extra = [], t) => group("tick", [path(F.tick(row.mid)), ...extra, stroke(F.FACE, c.tick.width, face)], t);
    const items = [group("line", [path(`M${c.line.x} ${row.mid} H${row.end}`), stroke(c.line.stroke, c.line.width)])];
    if (row.ticked) items.push(tickMark());
    else if (spec.tick?.row === i) items.push(tickMark([trim(spec.tick.draw)], tr({ o: spec.tick.o ?? 100 })));
    items.push(group("box", [rect(c.box.x, row.y, c.box.size, c.box.size, c.box.r), stroke(F.FACE, c.box.width, face)]));
    return group(`row-${i}`, items);
  });
  const sheet = group("sheet", [rect(c.sheet.x, c.sheet.y, c.sheet.width, c.sheet.height, c.sheet.r), stroke(c.sheet.stroke, 1), fill(c.sheet.fill)]);
  api.shapes("prop-checklist", parent, [group("checklist", [...rows, sheet], tr({ a: [c.tilt.x, c.tilt.y], r: spec.r ?? c.tilt.deg }))]);
}

// The held coin, in front of the hands; it can turn edge-on, and its glint twinkle.
function heldCoin(api, parent, spec) {
  const c = F.HELD_COIN;
  const disc = (nm, d, style) => group(nm, [ellipse([d.cx, d.cy], [d.r * 2, d.r * 2]), style]);
  api.shapes("prop-coin", parent, [
    group("glint", [path(c.glint), fill(F.SPARKLE_FILL)], tr({ a: [77, 84], s: spec.glintS ?? [100, 100], o: spec.glintO ?? 100 })),
    group("coin", [disc("ring", c.ring, stroke(c.ring.stroke, c.ring.width)), disc("face", c.face, fill(c.face.fill)), disc("back", c.back, fill(c.back.fill))], tr({ a: [c.face.cx, c.face.cy], s: spec.turn ?? [100, 100] })),
  ]);
}

// The whole figure, with every moving part a keyframe track:
//   lift (figure off the ground), squash (scale from the feet), sit (the body
//   lowered), tilt (lean about the coin's centre), arms (behind the coin, or in
//   front), legs, props, face, shadow, and extras on top.
function figure(api, m) {
  const root = api.null("kopikas", 0, { a: [0, 0], p: [PAD[0] * UNIT, PAD[1] * UNIT], s: [UNIT * 100, UNIT * 100] });
  api.shapes("shadow", root, [group("shadow", [ellipse([F.SHADOW.cx, F.SHADOW.cy], m.shadow), fill("#000000", { oSid: SLOTS.shadow, o: THEMES.light.shadow })])], { o: m.shadowO ?? 100 });
  const lift = api.null("lift", root, { p: m.lift });
  const squash = api.null("squash", lift, { a: [60, 135], s: m.squash });
  limb(api, "leg-left", squash, m.legL, m.footL, true);
  limb(api, "leg-right", squash, m.legR, m.footR, true);
  const body = m.sit ? api.null("body", squash, { p: m.sit }) : api.null("body", squash);
  const tilt = api.null("tilt", body, { a: [F.PIVOT.x, F.PIVOT.y], r: m.tilt });
  if (m.checklist) checklist(api, tilt, m.checklist);
  const arms = () => {
    limb(api, "arm-left", tilt, m.armL, m.handL);
    limb(api, "arm-right", tilt, m.armR, m.handR);
  };
  if (!m.armsFront) arms();
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
  api.shapes("eyes", tilt, eyes(m));
  if (m.brows !== undefined) api.shapes("brows", tilt, F.BROWS.map((d, i) => group(`brow-${i}`, [path(d), stroke(F.FACE, F.LINE_STROKE, { sid: SLOTS.face })])), { o: m.brows });
  api.shapes("mouth", tilt, mouth(m.mouth));
  if (m.armsFront) arms();
  if (m.heldCoin) heldCoin(api, tilt, m.heldCoin);
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

// The idle poses, each from its still pose in kopikas-figure.ts: these loop
// (proud plays once), starting and ending on that pose.
const still = (pose) => ({ legL: S[pose].legL, footL: S[pose].footL, legR: S[pose].legR, footR: S[pose].footR, armL: S[pose].armL, handL: S[pose].handL, armR: S[pose].armR, handR: S[pose].handR });
const hover = (n) => keys(...[0, 22, 45, 67, 90].map((t, i) => [t, F.HOVER_R[i % 2][n]]));

// Friendly, when hovered: head tilted, it lifts one small hand twice and blinks.
const friendly = composition("friendly", 90, (api) =>
  figure(api, {
    ...still("friendly"),
    lift: [0, 0],
    squash: [100, 100],
    shadow: shadowW(F.SHADOW.rx),
    tilt: keys([0, S.friendly.tilt, "inOut"], [45, 8.5, "inOut"], [90, S.friendly.tilt]),
    armR: hover(0),
    handR: hover(1),
    blink: keys([58, [100, 100]], [61, [100, 10]], [66, [100, 100]]),
    mouth: "smile",
  }),
);

// Saving, while loose change waits: it breathes and bobs, turns the coin in its
// hands to its edge and back, and the coin's glint fades and twinkles back.
const saving = composition("saving", 144, (api) =>
  figure(api, {
    ...still("saving"),
    armsFront: true,
    look: S.saving.look,
    mouth: "small",
    tilt: 0,
    lift: keys([0, [0, 0], "inOut"], [72, [0, -2], "inOut"], [144, [0, 0]]),
    squash: keys([0, [100, 100], "inOut"], [72, [98.5, 101.5], "inOut"], [144, [100, 100]]),
    shadow: keys([0, shadowW(F.SHADOW.rx), "inOut"], [72, shadowW(25.5), "inOut"], [144, shadowW(F.SHADOW.rx)]),
    blink: keys([30, [100, 100]], [33, [100, 10]], [38, [100, 100]]),
    heldCoin: {
      turn: keys([56, [100, 100], "in"], [66, [8, 100], "out"], [76, [100, 100]]),
      glintO: keys([50, 100], [58, 0, "hold"], [80, 0], [88, 100]),
      glintS: keys([0, [100, 100], "hold"], [79, [100, 100], "hold"], [80, [40, 40], "back"], [96, [100, 100]]),
    },
  }),
);

// Budgeting, while filing: it leans into the list, its eyes drop to the next
// row, a tick draws itself in, and it smiles. The tick fades before the loop.
const budgeting = composition("budgeting", 144, (api) =>
  figure(api, {
    ...still("budgeting"),
    lift: [0, 0],
    squash: [100, 100],
    shadow: shadowW(F.SHADOW.rx),
    tilt: keys([0, S.budgeting.tilt, "inOut"], [40, -7, "inOut"], [64, -7, "inOut"], [100, S.budgeting.tilt]),
    look: keys([30, S.budgeting.look, "inOut"], [42, [-3.5, 0.5], "inOut"], [70, [-3.5, 0.5], "inOut"], [84, S.budgeting.look]),
    blink: keys([110, [100, 100]], [113, [100, 10]], [118, [100, 100]]),
    mouth: {
      d: keys([56, F.MOUTHS.small.d, "out"], [68, F.MOUTHS.smile.d, "inOut"], [110, F.MOUTHS.smile.d, "inOut"], [124, F.MOUTHS.small.d]),
      width: keys([56, F.MOUTHS.small.width, "out"], [68, F.MOUTHS.smile.width, "inOut"], [110, F.MOUTHS.smile.width, "inOut"], [124, F.MOUTHS.small.width]),
    },
    checklist: {
      r: keys([40, F.CHECKLIST.tilt.deg, "inOut"], [50, -8.5, "back"], [62, F.CHECKLIST.tilt.deg]),
      tick: { row: 2, draw: keys([46, 0, "out"], [58, 100]), o: keys([124, 100, "inOut"], [136, 0]) },
    },
  }),
);

// Resting, with nothing to file: it sits and breathes, and its lids grow heavy
// as its head dips, then lift again.
const resting = composition("resting", 180, (api) =>
  figure(api, {
    ...still("resting"),
    sit: [0, S.resting.sit],
    eyes: "sleepy",
    mouth: "small",
    lift: [0, 0],
    squash: keys([0, [100, 100], "inOut"], [90, [101.5, 98], "inOut"], [180, [100, 100]]),
    tilt: keys([0, 0, "inOut"], [100, -2.5, "inOut"], [180, 0]),
    lids: keys([60, [100, 100], "inOut"], [100, [100, 35], "inOut"], [128, [100, 35], "inOut"], [160, [100, 100]]),
    shadow: keys([0, shadowW(S.resting.shadow.rx), "inOut"], [90, shadowW(35), "inOut"], [180, shadowW(S.resting.shadow.rx)]),
  }),
);

// Proud, when a past month came in under the one before: it puffs up, swings
// its hands to its hips, lifts its chin, and its eyes close contentedly under
// lifted brows as the smile widens. Plays once and holds the proud pose.
const proud = composition("proud", 72, (api) =>
  figure(api, {
    ...still("proud"),
    armL: keys([8, HANG.armL, "back"], [28, S.proud.armL]),
    handL: keys([8, HANG.handL, "back"], [28, S.proud.handL]),
    armR: keys([10, HANG.armR, "back"], [30, S.proud.armR]),
    handR: keys([10, HANG.handR, "back"], [30, S.proud.handR]),
    lift: keys([0, [0, 0], "out"], [14, [0, -3], "inOut"], [34, [0, 0]]),
    squash: keys([0, [100, 100], "out"], [14, [96, 106], "inOut"], [34, [102, 98], "back"], [44, [100, 100]]),
    tilt: keys([12, 0, "out"], [30, -9.5, "inOut"], [42, S.proud.tilt]),
    shadow: keys([0, shadowW(F.SHADOW.rx)], [14, shadowW(25)], [34, shadowW(28)], [44, shadowW(F.SHADOW.rx)]),
    // The dots squeeze shut, and the content arcs take over as they close.
    blink: keys([14, [100, 100], "in"], [20, [100, 8]]),
    eyes: [
      { kind: "content", o: keys([20, 0, "hold"], [21, 100]) },
      { kind: "dots", o: keys([20, 100, "hold"], [21, 0]) },
    ],
    brows: keys([20, 0], [28, 100]),
    mouth: {
      d: keys([14, F.MOUTHS.smile.d, "out"], [30, F.MOUTHS.big.d]),
      width: keys([14, F.MOUTHS.smile.width, "out"], [30, F.MOUTHS.big.width]),
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
  friendly: [[0, 0], [90, 90]],
  saving: [[0, 0], [144, 144]],
  budgeting: [[0, 0], [144, 144]],
  resting: [[0, 0], [180, 180]],
  proud: [[0, 0], [72, 72]],
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

// Hello first: the player in use starts on the file's first animation.
const ANIMATIONS = { hello, jump, excited, friendly, saving, budgeting, resting, proud };

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
