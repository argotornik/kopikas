// The three stage frames, rebuilt from exported scenes (gen-calls.mjs prepends SCENES, LEDGER, DATE).
for (const f of [["Fredoka", "SemiBold"], ["Rubik", "Regular"], ["Rubik", "Medium"]]) await figma.loadFontAsync({ family: f[0], style: f[1] });
// The text styles DESIGN.md has beyond the kit's first six, created or brought up to date.
const want = [
  { name: "Display · phone", family: "Fredoka", style: "SemiBold", size: 44, lh: 125, desc: "The month's total and the amount owed in Pooleks, on a phone (Display is 52 from 640px)." },
  { name: "Headline · phone", family: "Fredoka", style: "SemiBold", size: 34, lh: 100, desc: "The month's name and a page's own title, on a phone (Headline is 40 from 640px)." },
  { name: "Small head", family: "Fredoka", style: "SemiBold", size: 16, lh: 125, desc: "A head inside a section: \"Loose change\" by the pile, the months in Pooleks." },
  { name: "Field", family: "Rubik", style: "Regular", size: 16, lh: 137.5, desc: "Text in a field; a step above Body, because iOS zooms into any field set smaller." },
  { name: "Caption", family: "Rubik", style: "Regular", size: 12, lh: 125, desc: "The smallest text, under or beside a Label: a roll's limit, a queue tile's amount, the year strip's letters." },
];
const existing = await figma.getLocalTextStylesAsync();
const ensured = [];
for (const w of want) {
  let s = existing.find((x) => x.name === w.name);
  if (!s) { s = figma.createTextStyle(); s.name = w.name; }
  s.fontName = { family: w.family, style: w.style };
  s.fontSize = w.size;
  s.lineHeight = { unit: "PERCENT", value: w.lh };
  s.description = w.desc;
  ensured.push({ name: s.name, id: s.id });
}
// DESIGN.md's warm night greys, for what sits on Oat Paper Night: cards a step above, quiet fills a step below.
const coll = await figma.variables.getVariableCollectionByIdAsync(LEDGER.collection);
const haveVars = await figma.variables.getLocalVariablesAsync("COLOR");
const warmVars = [];
for (const [name, hex, desc] of [["dark/card-on-stage", "#2A282E", "card-oat-night: a card on an Oat Paper Night panel or dialog."], ["dark/mist-on-stage", "#1A181D", "mist-oat-night: a quiet fill (letter avatar, a button inside a card) on Oat Paper Night."]]) {
  let v = haveVars.find((x) => x.name === name);
  if (!v) v = figma.variables.createVariable(name, coll, "COLOR");
  v.setValueForMode(LEDGER.mode, { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255, a: 1 });
  v.description = desc;
  warmVars.push({ name, id: v.id });
}
const WT = { 400: "Regular", 500: "Medium", 600: "SemiBold" };
const page = await figma.getNodeByIdAsync("0:1");
await figma.setCurrentPageAsync(page);
const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const STYLES = Object.fromEntries((await figma.getLocalTextStylesAsync()).map((s) => [s.name, s.id]));
// A frame being rebuilt keeps its old self: renamed with today's date and moved left of everything.
const retire = (name) => { for (const n of page.children.filter((c) => c.type === "FRAME" && c.name === name)) { n.name = `${name} · replaced ${DATE}`; n.x = Math.min(0, ...page.children.map((c) => c.x)) - n.width - 200; } };
// DESIGN.md's eight steps (and the phone sizes), by font, weight and size.
const styleFor = (it) => it.f === "Fredoka" ? ({ 52: "Display", 44: "Display · phone", 40: "Headline", 34: "Headline · phone", 26: "Wordmark", 20: "Title", 16: "Small head" })[it.sz]
  : it.f === "Rubik" && +it.wt === 400 ? ({ 15: "Body", 16: "Field", 12: "Caption" })[it.sz]
  : it.f === "Rubik" && +it.wt === 500 && it.sz === 13 ? "Label" : null;
const results = [];
for (const { D, HV } of SCENES) {
const paint = async (h) => {
  const p = { type: "SOLID", color: rgb(h) };
  return HV[h] ? figma.variables.setBoundVariableForPaint(p, "color", await figma.variables.getVariableByIdAsync(HV[h])) : p;
};
retire(D.name);
const frame = figma.createFrame();
page.appendChild(frame);
frame.name = D.name; frame.x = D.x; frame.y = D.y; frame.resize(D.w, D.h);
frame.cornerRadius = D.radius; frame.clipsContent = true;
frame.fills = [await paint(D.bg)];
const label = (it) => it.role.startsWith("roll:") ? `Roll · ${it.role.slice(5)}` : it.role === "coin" ? "Coin" : it.role === "icon" ? "Icon" : it.w > 12 ? "Mark · squiggle" : "Mark · dot";
const made = [], missing = [];
for (const it of D.items) {
  if (it.k === "s") {
    const n = page.findChild((c) => c.name === it.n);
    if (!n) { missing.push(it.n); continue; }
    frame.appendChild(n);
    n.fills = []; n.clipsContent = false; n.name = label(it);
    const a = (it.r * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    n.relativeTransform = [[c, -s, it.cx - c * it.w / 2 + s * it.h / 2], [s, c, it.cy - s * it.w / 2 - c * it.h / 2]];
    made.push({ it, n });
  } else {
    const t = figma.createText();
    frame.appendChild(t);
    const style = styleFor(it);
    t.fontName = { family: it.f, style: WT[it.wt] };
    t.fontSize = it.sz;
    t.lineHeight = { unit: "PIXELS", value: it.lh };
    t.characters = it.t;
    if (style && STYLES[style]) await t.setTextStyleIdAsync(STYLES[style]);
    t.textAlignHorizontal = it.a === "center" ? "CENTER" : it.a === "right" || it.a === "end" ? "RIGHT" : "LEFT";
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.x = it.a === "center" ? it.x + it.w / 2 - t.width / 2 : it.x; t.y = it.y;
    t.fills = [await paint(it.c)];
    t.name = it.t;
    made.push({ it, n: t });
  }
}
// Each roll travels with its labels; the month and the loose change are groups of their own.
const groups = [];
const rolls = made.filter((m) => m.it.k === "s" && m.it.role.startsWith("roll:"));
const used = new Set();
for (const r of rolls) {
  const box = r.n.absoluteBoundingBox, fb = frame.absoluteBoundingBox;
  const cx = box.x - fb.x + box.width / 2, bottom = box.y - fb.y + box.height;
  const labels = made.filter((m) => m.it.k === "t" && !used.has(m) && (D.w < 640
    ? (m.n.y + m.n.height <= box.y - fb.y + 4 && m.n.y > box.y - fb.y - 30) || (Math.abs(m.n.y + m.n.height / 2 - (box.y - fb.y + box.height / 2)) < 15 && m.n.x >= box.x - fb.x + box.width - 2 && m.n.x < box.x - fb.x + box.width + 30)
    : Math.abs(m.n.x + m.n.width / 2 - cx) < 12 && m.n.y > bottom - 20));
  labels.forEach((m) => used.add(m));
  const g = figma.group([r.n, ...labels.map((m) => m.n)], frame);
  g.name = r.it.role.slice(5);
  groups.push(g.id);
}
const rest = made.filter((m) => !(m.it.k === "s" && m.it.role.startsWith("roll:")) && !used.has(m));
const pile = rest.filter((m) => m.it.k === "s" ? m.it.role === "coin" || m.it.role === "mark" : /Loose change|to file/.test(m.it.t));
const month = rest.filter((m) => !pile.includes(m) && (m.n.y < (D.w < 640 ? 180 : 240)));
if (pile.length) { const g = figma.group(pile.map((m) => m.n), frame); g.name = "Loose change"; groups.push(g.id); }
if (month.length) { const g = figma.group(month.map((m) => m.n), frame); g.name = "Month"; groups.push(g.id); }
results.push({ frame: frame.id, name: D.name, children: frame.children.length, missing });
}
return { ensured, warmVars, results };
