// Export a whole phone screen for Figma: boxes (fill, corners, inset ring, top rule), outer SVGs and
// text runs in DOM order, each tied to the nearest container (panel, button, bar) so the build can group
// them. Usage: node export-screen.mjs <light|dark> <tag> [path, default /]   writes out/<tag>.json
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [THEME = "light", TAG = "screen", PATH = "/"] = process.argv.slice(2);
const OUT = new URL(`out/${TAG}.json`, import.meta.url);
const src = readFileSync(new URL("./export-stage.mjs", import.meta.url), "utf8");
// The stage exporter's colour, rotation and SVG helpers, verbatim.
const helpers = src.slice(src.indexOf("  const toHex = (c) => {"), src.indexOf("  const items = [];")).replace(/\\\\/g, "\\");
const PORT = 9800 + Math.floor(Math.random() * 90);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ex-"))}`, "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let url; for (let i = 0; i < 50 && !url; i++) { try { url = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl; } catch {} if (!url) await sleep(200); }
const ws = new WebSocket(url); await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: THEME }, { name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(s); });` });
await send("Page.navigate", { url: "http://localhost:3000" + PATH });
await sleep(6000);
const r = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
  const root = document.body, VW = innerWidth, VH = innerHeight;
${helpers}
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  // Any CSS colour (oklab included) as hex and alpha, read back from a pixel.
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return { hex: "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join(""), a: Math.round((d[3] / 255) * 100) / 100 }; };
  const paintOf = (c) => { const v = rgba(c); return v.a === 0 ? null : v.a === 1 ? v.hex : v; };
  const shown = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0; };
  const onScreen = (b) => b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < VH && b.right > 0 && b.left < VW;
  const frameBg = rgba(getComputedStyle(document.body).backgroundColor).hex;
  const nameOf = (el) => el.closest("header") ? (el.matches("a,button") ? "Header · " + (el.getAttribute("aria-label") || el.innerText.trim()) : "Header") : el.matches('nav[aria-label="Board views"]') ? "Tab bar" : el.closest('nav[aria-label="Board views"]') ? "Tab · " + el.innerText.trim() : el.matches("section") ? "Panel" : el.matches("[role=group] > button") ? "Tile · " + el.innerText.trim().split("\\n")[0] : el.matches("button") ? "Pill · " + el.innerText.trim() : el.matches("[role=group] > button span") ? "Chip" : el.tagName.toLowerCase();
  const isContainer = (el) => el.matches('section, nav[aria-label="Board views"], button, header a');
  const items = [], index = new Map(), seen = new Set();
  const parentOf = (el) => { for (let a = el.parentElement; a && a !== root; a = a.parentElement) if (index.has(a) && isContainer(a)) return index.get(a); return -1; };
  const walk = (el) => {
    if (!shown(el) || el.closest(".sr-only")) return;
    if (el.tagName === "svg") { const b = el.getBoundingClientRect(); if (!onScreen(b)) return; index.set(el, items.length);
      items.push({ kind: "svg", role: el.closest("[role=group] > button") ? "roll" : el.closest("[data-coin]") || el.querySelector("ellipse") ? (el.closest("header") ? "logo" : "coin") : "icon", cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: +el.getAttribute("width") || b.width, h: +el.getAttribute("height") || b.height, rotation: angleOf(el), p: parentOf(el), svg: serialize(el) }); return; }
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (el !== root && onScreen(b)) {
      const fill = paintOf(cs.backgroundColor);
      const ring = (cs.boxShadow.match(/(rgba?\\([^)]*\\)|oklab\\([^)]*\\)|color\\([^)]*\\))\\s+0px\\s+0px\\s+0px\\s+([0-9.]+)px\\s+inset/) || []);
      const ringPaint = ring[2] ? paintOf(ring[1]) : null;
      const top = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" ? paintOf(cs.borderTopColor) : null;
      const full = b.width >= VW && b.height >= VH && fill === frameBg;
      if ((fill || ringPaint || top || isContainer(el)) && !full) { index.set(el, items.length);
        items.push({ kind: "box", name: nameOf(el), x: b.left, y: b.top, w: b.width, h: b.height, radius: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, b.height / 2), fill, ring: ringPaint ? { color: ringPaint, width: +ring[2] } : null, top: top ? { color: top, width: parseFloat(cs.borderTopWidth) } : null, container: isContainer(el), p: parentOf(el) }); }
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 1) walk(n);
      else if (n.nodeType === 3 && n.textContent.trim() && !seen.has(el)) {
        let inSeen = false; for (let a = el; a && a !== root; a = a.parentElement) if (seen.has(a)) { inSeen = true; break; } if (inSeen) continue;
        seen.add(el); const tb = el.getBoundingClientRect(); if (!onScreen(tb) || tb.width < 2) continue;
        const block = el.closest("div,p,h1,h2,h3,span,button,a");
        items.push({ kind: "text", text: el.textContent.replace(/\\s+/g, " ").trim(), x: tb.left, y: tb.top, w: tb.width, h: tb.height, family: cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim(), weight: cs.fontWeight, size: parseFloat(cs.fontSize), lineHeight: cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight), color: paintOf(cs.color), align: getComputedStyle(block).textAlign, p: isContainer(el) && index.has(el) ? index.get(el) : parentOf(el) });
      }
    }
  };
  walk(root);
  return { w: VW, h: VH, bg: frameBg, items };
})()` });
if (r.result.exceptionDetails) { console.error(r.result.exceptionDetails.exception?.description); process.exit(1); }
const scene = r.result.result.value;
writeFileSync(OUT, JSON.stringify(scene));
const k = (t) => scene.items.filter((i) => i.kind === t).length;
console.log(`out/${TAG}.json`, scene.w + "x" + scene.h, "bg", JSON.stringify(scene.bg), "boxes", k("box"), "svg", k("svg"), "text", k("text"), "bytes", JSON.stringify(scene).length);
ws.close(); chrome.kill();
