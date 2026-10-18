// Write each exported scene's SVG layers to out/svg, named as the Figma layers the builds look for:
// <tag>__<index>__<role>.svg. Usage: node svgs.mjs <tag>... [--parts <stageTag> <screenTag>]
// --parts adds the 2026-10-18 Parts pieces: the pile's puzzled coins and the busy coin's four poses.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const out = new URL("out/svg/", import.meta.url);
mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const at = args.indexOf("--parts");
const tags = at < 0 ? args : args.slice(0, at);
const scene = (tag) => JSON.parse(readFileSync(new URL(`out/${tag}.json`, import.meta.url), "utf8"));
const slug = (r) => r.replace(/[^a-z0-9]+/gi, "-");
let n = 0;
const write = (name, svg) => { writeFileSync(new URL(`${name}.svg`, out), svg); n++; };
for (const tag of tags) scene(tag).items.forEach((it, i) => { if (it.kind === "svg") write(`${tag}__${String(i).padStart(2, "0")}__${slug(it.role)}`, it.svg); });
if (at >= 0) {
  const [stageTag, screenTag] = args.slice(at + 1);
  // The pile's coins as they are drawn, unrotated: copper first, then brass.
  for (const c of scene(stageTag).items.filter((it) => it.kind === "svg" && it.role === "coin")) {
    const metal = /#c9773f/i.test(c.svg) ? "copper" : /#e3b341/i.test(c.svg) ? "brass" : "other";
    write(`parts__coin-${metal}-puzzled`, c.svg);
  }
  // The busy coin's hop (globals.css coin-hop): the header's smiling coin at 40px, squashed from its foot.
  const head = scene(screenTag).items.find((it) => it.kind === "svg" && it.role === "coin").svg;
  const vb = head.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const inner = head.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const k = 40 / vb[2];
  for (const [name, dy, sx, sy] of [["0-rest", 0, 1, 1], ["38-top", -15.2, 1, 1], ["62-land", 0, 1.12, 0.84], ["76-settle", 0, 0.97, 1.04]]) {
    const g = `translate(${20 - 20 * sx} ${40 - 40 * sy + dy}) scale(${sx * k} ${sy * k}) translate(${-vb[0]} ${-vb[1]})`;
    write(`parts__busy-${name}`, `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="-4 -18 48 60" overflow="visible"><g transform="${g}">${inner}</g></svg>`);
  }
}
console.log(n, "svg files in out/svg");
