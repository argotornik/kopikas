// Phone screens, rebuilt from exported scenes (gen-calls.mjs prepends SCREENS, WRAP, DATE).
const WT = { 400: "Regular", 500: "Medium", 600: "SemiBold" };
for (const f of [["Fredoka", "SemiBold"], ["Rubik", "Regular"], ["Rubik", "Medium"]]) await figma.loadFontAsync({ family: f[0], style: f[1] });
const stage = await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(stage);
const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const STYLES = Object.fromEntries((await figma.getLocalTextStylesAsync()).map((s) => [s.name, s.id]));
const styleFor = (it) => it.f === "Fredoka" ? ({ 52: "Display", 44: "Display · phone", 40: "Headline", 34: "Headline · phone", 26: "Wordmark", 20: "Title", 16: "Small head" })[it.sz]
  : it.f === "Rubik" && +it.wt === 400 ? ({ 15: "Body", 16: "Field", 12: "Caption" })[it.sz]
  : it.f === "Rubik" && +it.wt === 500 && it.sz === 13 ? "Label" : null;
const VARS = Object.fromEntries((await figma.variables.getLocalVariablesAsync("COLOR")).map((v) => [v.name, v]));
// Binding a paint to a variable drops its opacity, so a translucent one gets it back.
const paint = (c, name) => { const p = typeof c === "string" ? { type: "SOLID", color: rgb(c) } : { type: "SOLID", color: rgb(c.hex), opacity: c.a }; if (!name || !VARS[name]) return p; const b = figma.variables.setBoundVariableForPaint(p, "color", VARS[name]); return p.opacity === undefined ? b : { ...b, opacity: p.opacity }; };
const fillVar = (theme, hex, box) => WRAP[hex] ? "wrapper/" + WRAP[hex] : theme === "light"
  ? ({ "#ffffff": box === "Tab bar" ? "light/page" : "light/card", "#efebe3": "light/stage", "#16171c": "light/ink" })[hex]
  : ({ "#1f1d22": "dark/stage", "#2a282e": "dark/card-on-stage", "#1a181d": "dark/mist-on-stage", "#23252e": "dark/card", "#0f1015": "dark/page", "#f3f2ee": "dark/ink" })[hex];
const textVar = (theme, hex) => theme === "light" ? ({ "#16171c": "light/ink", "#63666f": "light/muted" })[hex] : ({ "#f3f2ee": "dark/ink", "#a7a9b4": "dark/muted" })[hex];
// A frame being rebuilt keeps its old self: renamed with today's date and moved left of everything.
const retire = (name) => { for (const n of stage.children.filter((c) => c.type === "FRAME" && c.name === name)) { n.name = `${name} · replaced ${DATE}`; n.x = Math.min(0, ...stage.children.map((c) => c.x)) - n.width - 200; } };
// The old frames step aside first, then the first row's right edge says where the screens go.
for (const S of SCREENS) retire(S.name);
const row = stage.children.filter((n) => n.x >= 0 && n.y < 900 && n.y + n.height > 0 && !n.name.includes("__"));
let X = Math.max(...row.map((n) => n.x + n.width)) + 120;
const out = [];
for (const S of SCREENS) {
  const frame = figma.createFrame();
  stage.appendChild(frame);
  frame.name = S.name; frame.x = X; frame.y = 0; frame.resize(S.w, S.h); frame.clipsContent = true; frame.cornerRadius = 0;
  frame.fills = [paint(S.bg, S.theme + "/page")];
  X += S.w + 80;
  const nodes = [], missing = [];
  for (const it of S.items) {
    let n = null;
    if (it.k === "b") {
      n = figma.createRectangle(); frame.appendChild(n);
      n.name = it.name; n.x = it.x; n.y = it.y; n.resize(Math.max(it.w, 0.01), Math.max(it.h, 0.01)); n.cornerRadius = it.rad;
      n.fills = it.fill ? [paint(it.fill, typeof it.fill === "string" ? fillVar(S.theme, it.fill, it.name) : null)] : [];
      if (it.ring) { n.strokes = [paint(it.ring.c, S.theme === "light" ? "light/ink" : null)]; n.strokeWeight = it.ring.w; n.strokeAlign = "INSIDE"; }
      if (it.top) { const rule = figma.createRectangle(); frame.appendChild(rule); rule.name = "Rule"; rule.x = it.x; rule.y = it.y; rule.resize(it.w, it.top.w); rule.fills = [paint(it.top.c, S.theme === "light" ? "light/ink" : null)]; nodes.push({ it: { ...it, k: "r", box: false }, n: rule }); }
    } else if (it.k === "s") {
      n = stage.findChild((c) => c.name === it.n);
      if (!n) { missing.push(it.n); nodes.push({ it, n: null }); continue; }
      frame.appendChild(n); n.fills = []; n.clipsContent = false; n.name = it.role === "coin" ? "Coin" : it.role === "logo" ? "Logo" : it.role === "roll" ? "Roll" : "Icon";
      const a = (it.r * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      n.relativeTransform = [[c, -s, it.cx - c * it.w / 2 + s * it.h / 2], [s, c, it.cy - s * it.w / 2 - c * it.h / 2]];
    } else {
      n = figma.createText(); frame.appendChild(n);
      n.fontName = { family: it.f, style: WT[it.wt] }; n.fontSize = it.sz;
      if (it.lh) n.lineHeight = { unit: "PIXELS", value: it.lh };
      n.characters = it.t;
      const style = styleFor(it); if (style && STYLES[style]) await n.setTextStyleIdAsync(STYLES[style]);
      n.textAlignHorizontal = it.a === "center" ? "CENTER" : it.a === "right" || it.a === "end" ? "RIGHT" : "LEFT";
      n.textAutoResize = "WIDTH_AND_HEIGHT";
      n.x = it.a === "center" ? it.x + it.w / 2 - n.width / 2 : it.x; n.y = it.y;
      // A button's label comes with the button's box: centre it in there, as the button does.
      if (it.lh && it.h > it.lh * 1.5) n.y = it.y + (it.h - n.height) / 2;
      n.fills = [paint(it.c, typeof it.c === "string" ? textVar(S.theme, it.c) : null)];
      n.name = it.t;
    }
    nodes.push({ it, n });
  }
  // Group each container (panel, tile, pill, tab, header link) with what it holds, innermost first.
  const exported = S.items;
  const holder = nodes.map(() => null);
  let k = 0; const byItem = [];
  for (const m of nodes) { if (m.it.k !== "r") byItem.push(m); }
  const rules = nodes.filter((m) => m.it.k === "r");
  for (let i = exported.length - 1; i >= 0; i--) {
    const it = exported[i]; if (it.k !== "b" || !it.box || !byItem[i].n) continue;
    const kids = [];
    for (let j = i + 1; j < exported.length; j++) if (exported[j].p === i && (holder[j] || byItem[j].n)) kids.push(holder[j] || byItem[j].n);
    if (it.name === "Tab bar") kids.unshift(...rules.map((m) => m.n));
    const g = figma.group([byItem[i].n, ...kids], frame);
    g.name = it.name; holder[i] = g;
  }
  // Grouping can lift a filled box over a label beside it: every label goes back on top.
  for (const t of frame.findAll((n) => n.type === "TEXT")) t.parent.appendChild(t);
  // The tab bar sits over the panel's last tiles, as it does on the phone.
  const bar = frame.children.find((c) => c.name === "Tab bar"); if (bar) frame.appendChild(bar);
  out.push({ frame: frame.id, name: S.name, x: frame.x, children: frame.children.map((c) => c.name), missing });
}
const result = { screens: out };
