// Export the board's stage as a scene for Figma: every outer SVG (styles resolved, rotation measured)
// and every text run, positioned relative to the stage, from the dev server at :3000.
// Usage: node export-stage.mjs <width> <light|dark> <tag>   writes out/<tag>.json
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [W = "1440", THEME = "light", TAG = "stage"] = process.argv.slice(2);
const OUT = new URL(`out/${TAG}.json`, import.meta.url);
const width = +W, phone = width < 640;
const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ex-"))}`, "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let url; for (let i = 0; i < 50 && !url; i++) { try { url = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl; } catch {} if (!url) await sleep(200); }
const ws = new WebSocket(url); await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height: phone ? 2000 : 1100, deviceScaleFactor: 1, mobile: phone });
// Reduced motion: every face settled, no blinks or drifting marks mid-animation.
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: THEME }, { name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(s); });` });
await send("Page.navigate", { url: "http://localhost:3000/?month=2026-09" });
await sleep(6000);
const r = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
  const root = document.querySelector('section[aria-labelledby="month-heading"]');
  const R = root.getBoundingClientRect();
  const toHex = (c) => {
    if (!c || c === 'none' || c === 'transparent') return c;
    let m = c.match(/^rgba?\\(([^)]+)\\)/);
    let parts, a = 1;
    if (m) { parts = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); if (parts.length > 3) a = parts[3]; parts = parts.slice(0, 3); }
    else if ((m = c.match(/^color\\(srgb ([^)]+)\\)/))) { const p = m[1].split(/[ \\/]+/).filter(Boolean).map(Number); parts = p.slice(0, 3).map((v) => v * 255); if (p.length > 3) a = p[3]; }
    else return c;
    const hex = '#' + parts.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
    return a < 1 ? { hex, a } : hex;
  };
  const angleOf = (el) => { let deg = 0; for (let n = el; n && n !== root; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.transform && cs.transform !== 'none') { const mm = cs.transform.match(/matrix\\(([^)]+)\\)/); if (mm) { const [a, b] = mm[1].split(',').map(Number); deg += Math.atan2(b, a) * 180 / Math.PI; } } if (cs.rotate && cs.rotate !== 'none') deg += parseFloat(cs.rotate); } return Math.round(deg * 10) / 10; };
  const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity'];
  const serialize = (svg) => {
    const clone = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
    const drop = [];
    src.forEach((el, i) => {
      const d = dst[i], cs = getComputedStyle(el);
      if (cs.display === 'none' || +cs.opacity === 0 || (el.tagName === 'path' && !el.getAttribute('d'))) { drop.push(d); return; }
      if (i > 0 && ['path', 'ellipse', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g'].includes(el.tagName)) {
        for (const p of PROPS) { let v = cs.getPropertyValue(p); if (!v) continue; if (p === 'fill' || p === 'stroke') { const h = toHex(v); if (h && typeof h === 'object') { d.setAttribute(p, h.hex); d.setAttribute(p + '-opacity', String(h.a)); continue; } v = h; } if (p === 'stroke-dasharray' && v === 'none') continue; if (p === 'opacity' && +v === 1) continue; if ((p === 'fill-opacity' || p === 'stroke-opacity') && +v === 1) continue; d.setAttribute(p, v); }
        if (cs.transform && cs.transform !== 'none' && el.tagName !== 'svg') d.setAttribute('transform', cs.transform.replace(/,\\s*/g, ' '));
      }
      d.removeAttribute('class'); d.removeAttribute('style');
    });
    drop.forEach((d) => d.remove());
    const b = svg.getBoundingClientRect();
    clone.setAttribute('width', svg.getAttribute('width') || Math.round(b.width));
    clone.setAttribute('height', svg.getAttribute('height') || Math.round(b.height));
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 ' + clone.getAttribute('width') + ' ' + clone.getAttribute('height'));
    clone.removeAttribute('aria-hidden'); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('overflow', 'visible');
    return clone.outerHTML.replace(/\\s+/g, ' ');
  };
  const items = [];
  for (const svg of root.querySelectorAll('svg')) {
    if (svg.parentElement.closest('svg')) continue;
    const b = svg.getBoundingClientRect(); if (b.width < 1) continue;
    const roll = svg.closest('[data-roll]'), coin = svg.closest('[data-coin]');
    items.push({ kind: 'svg', role: roll ? 'roll:' + roll.dataset.roll : coin ? 'coin' : svg.closest('.coins-float') ? 'mark' : svg.closest('button') ? 'icon' : 'svg', cx: b.left + b.width / 2 - R.left, cy: b.top + b.height / 2 - R.top, w: +svg.getAttribute('width') || b.width, h: +svg.getAttribute('height') || b.height, rotation: angleOf(svg), svg: serialize(svg) });
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement; if (!t.textContent.trim() || seen.has(el) || el.closest('svg') || el.closest('.sr-only')) continue;
    let inSeen = false; for (let a = el.parentElement; a && a !== root; a = a.parentElement) if (seen.has(a)) { inSeen = true; break; } if (inSeen) continue;
    seen.add(el);
    const b = el.getBoundingClientRect(); if (b.width < 2) continue;
    const cs = getComputedStyle(el);
    const block = el.closest('div,p,h1,h2,h3,span');
    items.push({ kind: 'text', text: el.textContent.replace(/\\s+/g, ' ').trim(), x: b.left - R.left, y: b.top - R.top, w: b.width, h: b.height, family: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(), weight: cs.fontWeight, size: parseFloat(cs.fontSize), lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight), color: toHex(cs.color), align: getComputedStyle(block).textAlign, tabular: cs.fontVariantNumeric.includes('tabular') });
  }
  const cs = getComputedStyle(root);
  return { w: R.width, h: R.height, bg: toHex(cs.backgroundColor), radius: parseFloat(cs.borderTopLeftRadius), items };
})()` });
const scene = r.result.result.value;
writeFileSync(OUT, JSON.stringify(scene));
console.log(`out/${TAG}.json`, Math.round(scene.w) + "x" + Math.round(scene.h), "items", scene.items.length, "svg", scene.items.filter((i) => i.kind === "svg").length, "text", scene.items.filter((i) => i.kind === "text").length, "bytes", JSON.stringify(scene).length);
ws.close(); chrome.kill();
