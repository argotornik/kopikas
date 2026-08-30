import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Server-side favicon proxy with a local cache. Browsers only ever talk to
// this app — the merchant list never leaks to the favicon service from
// viewers; each icon is fetched once, here, then served from disk.
// Hosted build: same route, cache moves to a blob/bytea column.

const CACHE_DIR = path.join(process.cwd(), "data", "icons");
const DOMAIN_RE = /^[a-z0-9][a-z0-9.-]{1,60}$/;

export async function GET(req: Request) {
  const domain = new URL(req.url).searchParams.get("domain") ?? "";
  if (!DOMAIN_RE.test(domain)) return new NextResponse(null, { status: 400 });

  const file = path.join(CACHE_DIR, `${domain}.png`);
  try {
    return icon(new Uint8Array(await fs.readFile(file)));
  } catch {
    // cache miss — fetch below
  }

  const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  if (!res.ok) return new NextResponse(null, { status: 404 });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 50) return new NextResponse(null, { status: 404 });

  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(file, buf);
  } catch {
    // Read-only filesystem (serverless): serve uncached until the icons
    // table takes over as the cache in the hosted build.
  }
  return icon(buf);
}

function icon(buf: Uint8Array) {
  return new NextResponse(new Blob([Uint8Array.from(buf)]), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=2592000, s-maxage=2592000" },
  });
}
