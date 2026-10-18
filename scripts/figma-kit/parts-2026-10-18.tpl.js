// One-off, 2026-10-18: the Coin set's puzzled mood and the busy coin's hop on Parts. Appended to the
// screens call with --with-parts; guarded so a second run adds nothing.
// Parts: the coin gains its puzzled mood, and the busy coin's hop is laid out pose by pose.
const parts = await figma.getNodeByIdAsync("2:46");
const set = await figma.getNodeByIdAsync("9:162");
const before = set.children.map((c) => c.name);
const modeId = Object.keys(VARS["coin/copper/body"].valuesByMode)[0];
const hexOf = (v) => { const c = v.valuesByMode[modeId]; return c && "r" in c ? "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("") : null; };
const coinVar = {};
for (const v of Object.values(VARS)) if (/^(coin\/|paint\/|light\/limb)/.test(v.name)) { const h = hexOf(v); if (h && !coinVar[h]) coinVar[h] = v; }
const bindAll = (root) => { let bound = 0; for (const n of root.findAll((x) => "fills" in x)) for (const key of ["fills", "strokes"]) { if (!Array.isArray(n[key])) continue; n[key] = n[key].map((p) => { if (p.type !== "SOLID") return p; const h = "#" + [p.color.r, p.color.g, p.color.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); if (!coinVar[h]) return p; bound++; return figma.variables.setBoundVariableForPaint(p, "color", coinVar[h]); }); } return bound; };
// Run once: skipped when the set already has its puzzled coins or the page its strip.
const hasPuzzled = set.children.some((c) => /Mood=Puzzled/.test(c.name));
for (const c of set.children) if (!/Mood=/.test(c.name)) c.name = c.name + ", Mood=Happy";
const pad = Math.min(...set.children.map((c) => c.x));
let bottom = Math.max(...set.children.map((c) => c.y + c.height));
const added = [];
for (const metal of hasPuzzled ? [] : ["copper", "brass"]) {
  const node = stage.findChild((c) => c.name === `parts__coin-${metal}-puzzled`);
  const twin = set.children.find((c) => c.name.toLowerCase().includes(metal) && /Mood=Happy/.test(c.name));
  if (!node || !twin) { added.push({ metal, node: !!node, twin: !!twin }); continue; }
  parts.appendChild(node); node.fills = []; node.clipsContent = false;
  const comp = figma.createComponentFromNode(node);
  comp.name = twin.name.replace("Mood=Happy", "Mood=Puzzled");
  set.appendChild(comp);
  if (set.layoutMode === "NONE") { comp.x = twin.x; comp.y = bottom + 20; }
  comp.description = "A coin still to file: lost, one eye raised and its curve tilted. The raised eye alternates coin to coin.";
  added.push({ name: comp.name, bound: bindAll(comp) });
}
bottom = Math.max(...set.children.map((c) => c.y + c.height));
if (set.layoutMode === "NONE") set.resize(Math.max(...set.children.map((c) => c.x + c.width)) + pad, bottom + pad);
const pageBottom = Math.max(...parts.children.filter((n) => !n.name.startsWith("parts__")).map((n) => n.y + n.height));
const poseOut = [];
const hadStrip = parts.children.some((n) => n.name === "Busy coin · hop");
const strip = hadStrip ? null : figma.createFrame();
if (strip) {
parts.appendChild(strip);
strip.name = "Busy coin · hop"; strip.x = 0; strip.y = pageBottom + 120;
strip.layoutMode = "VERTICAL"; strip.itemSpacing = 12; strip.paddingTop = strip.paddingBottom = strip.paddingLeft = strip.paddingRight = 24;
strip.primaryAxisSizingMode = "AUTO"; strip.counterAxisSizingMode = "AUTO"; strip.cornerRadius = 28;
strip.fills = [paint("#efebe3", "light/stage")];
const head = figma.createText(); strip.appendChild(head); head.fontName = { family: "Rubik", style: "Medium" }; head.fontSize = 13; head.characters = "Busy coin · hop"; if (STYLES.Label) await head.setTextStyleIdAsync(STYLES.Label); head.fills = [paint("#16171c", "light/ink")];
const cap = figma.createText(); strip.appendChild(cap); cap.fontName = { family: "Rubik", style: "Regular" }; cap.fontSize = 12; cap.characters = "The app's one loading sign, 16px beside a button's words: every 0.9s it rises 38% of its height and squashes from its foot as it lands. With reduced motion it stands still."; if (STYLES.Caption) await cap.setTextStyleIdAsync(STYLES.Caption); cap.fills = [paint("#63666f", "light/muted")]; cap.resize(420, cap.height); cap.textAutoResize = "HEIGHT";
const poses = figma.createFrame(); strip.appendChild(poses); poses.name = "Poses"; poses.layoutMode = "HORIZONTAL"; poses.itemSpacing = 28; poses.fills = []; poses.primaryAxisSizingMode = "AUTO"; poses.counterAxisSizingMode = "AUTO";
for (const [key, label] of [["0-rest", "0% · rest"], ["38-top", "38% · top"], ["62-land", "62% · lands"], ["76-settle", "76% · settles"]]) {
  const node = stage.findChild((c) => c.name === `parts__busy-${key}`);
  if (!node) { poseOut.push({ key, missing: true }); continue; }
  const col = figma.createFrame(); poses.appendChild(col); col.name = label; col.layoutMode = "VERTICAL"; col.itemSpacing = 6; col.counterAxisAlignItems = "CENTER"; col.fills = []; col.primaryAxisSizingMode = "AUTO"; col.counterAxisSizingMode = "AUTO";
  col.appendChild(node); node.fills = []; node.clipsContent = false; node.name = "Coin"; bindAll(node);
  const t = figma.createText(); col.appendChild(t); t.fontName = { family: "Rubik", style: "Regular" }; t.fontSize = 12; t.characters = label; if (STYLES.Caption) await t.setTextStyleIdAsync(STYLES.Caption); t.fills = [paint("#63666f", "light/muted")];
  poseOut.push({ key, ok: true });
}
}
result.coinSet = { before, after: set.children.map((c) => c.name), added };
result.busy = strip ? { id: strip.id, poses: poseOut } : "already there";

