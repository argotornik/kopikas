// POST the SVG layers not uploaded yet (out/svg minus out/uploaded.txt) to Figma's single-use upload
// URLs: the submitUrl values from upload_assets, one per line in the given file. Each file's name
// becomes its layer's name. Usage: node upload.mjs <urls.txt>
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
const dir = new URL("out/", import.meta.url);
const log = new URL("uploaded.txt", dir);
const done = new Set(existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : []);
const urls = readFileSync(process.argv[2], "utf8").split(/\s+/).filter((u) => u.startsWith("https://"));
const files = readdirSync(new URL("svg/", dir)).filter((f) => f.endsWith(".svg") && !done.has(f.slice(0, -4))).sort();
console.log(`${files.length} waiting, ${urls.length} upload URLs`);
for (const [i, url] of urls.entries()) {
  const f = files[i];
  if (!f) break;
  const body = new FormData();
  body.append("file", new Blob([readFileSync(new URL(`svg/${f}`, dir))], { type: "image/svg+xml" }), f);
  const res = await fetch(url, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  console.log(res.status, f, json.success ? "" : JSON.stringify(json));
  if (res.ok && json.success) appendFileSync(log, f.slice(0, -4) + "\n");
}
