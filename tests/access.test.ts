import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// Access is decided by each page and route, not by proxy.ts, so a new page is
// public unless it asks. Every page calls pageRole() and every route calls
// currentRole(), or is listed here as public on purpose. Paths are under app/.
const PUBLIC = new Set([
  "sign-in/[[...sign-in]]/page.tsx", // the way in
  "api/version/route.ts", // the live commit SHA, for checking a deploy landed
]);

const app = new URL("../app/", import.meta.url);
const files = readdirSync(app, { recursive: true }) as string[];
const source = (file: string) => readFileSync(new URL(file, app), "utf8");

test("every page checks access through pageRole(), or is public on purpose", () => {
  const pages = files.filter((f) => f.endsWith("page.tsx") && !PUBLIC.has(f));
  assert.ok(pages.length > 0);
  for (const page of pages) {
    assert.match(source(page), /\bpageRole\(\)/, `app/${page} neither calls pageRole() nor is listed as public`);
  }
});

test("every route checks access through currentRole(), or is public on purpose", () => {
  const routes = files.filter((f) => f.endsWith("route.ts") && !PUBLIC.has(f));
  assert.ok(routes.length > 0);
  for (const route of routes) {
    assert.match(source(route), /\bcurrentRole\(\)/, `app/${route} neither calls currentRole() nor is listed as public`);
  }
});

test("everything listed as public still exists", () => {
  for (const f of PUBLIC) assert.ok(files.includes(f), `app/${f} is listed as public but no longer exists`);
});
