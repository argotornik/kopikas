// Emit a use_figma script into out/ from exported scenes (see README.md). Usage:
//   node gen-calls.mjs stage <light> <dark> <phone>     out/call-stage.js: styles, warm variables, the stage frames
//                                                       (a tag of - leaves that frame as it is)
//   node gen-calls.mjs screens <light> <dark> [--with-parts]   out/call-screens.js: the phone's To file screens
//   node gen-calls.mjs instances <frame id>...          out/call-instances.js: coins and marks in those frames become
//                                                       instances of their Parts (the builds above do this to theirs)
import { readFileSync, writeFileSync } from "node:fs";
const here = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(here(p), "utf8");
const L = JSON.parse(read("ledger.json")), V = L.vars;
const DATE = new Date().toISOString().slice(0, 10);
const [mode, ...rest] = process.argv.slice(2);
const r1 = (n) => Math.round(n * 100) / 100;
const slug = (r) => r.replace(/[^a-z0-9]+/gi, "-");
const scene = (tag) => JSON.parse(read(`out/${tag}.json`));
const layer = (tag, i, role) => `${tag}__${String(i).padStart(2, "0")}__${slug(role)}`;
const text = (it) => ({ k: "t", t: it.text.replace(/­/g, ""), x: r1(it.x), y: r1(it.y), w: r1(it.w), h: r1(it.h), f: it.family, wt: it.weight, sz: it.size, lh: it.lineHeight, c: it.color, a: it.align });
const write = (name, code) => { writeFileSync(here(`out/${name}`), code); console.log(`out/${name}`, code.length, "chars", code.length > 50000 ? "(over use_figma's 50,000)" : ""); };
if (mode === "stage") {
  const [light, dark, phone] = rest;
  const HV = {
    light: { "#efebe3": V["light/stage"], "#16171c": V["light/ink"], "#63666f": V["light/muted"], "#0a763f": V["light/received"] },
    dark: { "#1f1d22": V["dark/stage"], "#f3f2ee": V["dark/ink"], "#a7a9b4": V["dark/muted"], "#4fd18b": V["dark/received"] },
  };
  const build = (tag, name, x, y, theme) => {
    const s = scene(tag);
    const items = s.items.map((it, i) => it.kind === "svg" ? { k: "s", n: layer(tag, i, it.role), role: it.role, cx: r1(it.cx), cy: r1(it.cy), w: it.w, h: it.h, r: it.rotation || 0 } : text(it));
    return { D: { name, x, y, w: s.w, h: Math.ceil(s.h), bg: s.bg, radius: s.radius, items }, HV: HV[theme] };
  };
  const SCENES = [[light, "Stage · 1440 · light", 0, 0, "light"], [dark, "Stage · 1440 · dark", 0, 760, "dark"], [phone, "Phone · 375 · light", 1252, 0, "light"]].filter(([tag]) => tag && tag !== "-").map((a) => build(...a));
  write("call-stage.js", `const SCENES = ${JSON.stringify(SCENES)};\nconst LEDGER = ${JSON.stringify({ collection: L.collection, mode: L.mode })};\nconst DATE = ${JSON.stringify(DATE)};\n${read("stage.tpl.js")}${read("instances.tpl.js")}\nreturn result;\n`);
} else if (mode === "screens") {
  const [light, dark] = rest.filter((a) => !a.startsWith("--"));
  // Translucent rings and rules come back from the canvas slightly off; they are Ink (or white) at an opacity.
  const snap = (c, theme) => (c && typeof c === "object" ? { hex: theme === "light" ? "#16171c" : "#ffffff", a: c.a } : c);
  const build = (tag, name, theme) => {
    const s = scene(tag);
    const items = s.items.map((it, i) => it.kind === "svg" ? { k: "s", n: layer(tag, i, it.role), role: it.role, cx: r1(it.cx), cy: r1(it.cy), w: it.w, h: it.h, r: it.rotation || 0, p: it.p }
      : it.kind === "box" ? { k: "b", name: it.name, x: r1(it.x), y: r1(it.y), w: r1(it.w), h: r1(it.h), rad: r1(it.radius), fill: it.fill, ring: it.ring ? { c: snap(it.ring.color, theme), w: it.ring.width } : null, top: it.top ? { c: snap(it.top.color, theme), w: it.top.width } : null, box: it.container, p: it.p }
      : { ...text(it), p: it.p });
    return { name, theme, w: s.w, h: s.h, bg: s.bg, items };
  };
  // DESIGN.md's wrapper colours, by hex, to the kit's wrapper variables.
  const WRAP = { "#6c8eea": "01-cornflower", "#e2553b": "02-tomato", "#f0a3b4": "03-pink", "#3f9a55": "04-grass", "#6b4630": "05-brown", "#a9c8f5": "06-sky", "#d9e85a": "07-lime", "#8c6bd9": "08-lavender", "#f2c14e": "09-yolk", "#b8b8b8": "10-grey", "#c7432f": "11-brick", "#8fcb9b": "12-mint", "#e8a15c": "13-apricot", "#2e9e9a": "14-teal" };
  const SCREENS = [build(light, "To file · 390 · light", "light"), build(dark, "To file · 390 · dark", "dark")];
  const parts = rest.includes("--with-parts") ? read("parts-2026-10-18.tpl.js") : "";
  write("call-screens.js", `const SCREENS = ${JSON.stringify(SCREENS)};\nconst WRAP = ${JSON.stringify(WRAP)};\nconst DATE = ${JSON.stringify(DATE)};\n${read("screen.tpl.js")}${parts}${read("instances.tpl.js")}\nreturn result;\n`);
} else if (mode === "instances" && rest.length) {
  write("call-instances.js", `const FRAME_IDS = ${JSON.stringify(rest)};\nconst result = {};\n${read("instances.tpl.js")}\nreturn result;\n`);
} else {
  console.log("Usage: node gen-calls.mjs stage <light> <dark> <phone> | screens <light> <dark> [--with-parts] | instances <frame id>...");
  process.exit(1);
}
