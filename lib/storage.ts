import { promises as fs } from "fs";
import path from "path";
import type { Db } from "./types";
import { seedDb } from "./seed";

// The single storage module. Dev adapter: one JSON file per collection under ./data,
// seeded with mock data on first read. The hosted build swaps this file's internals
// for Neon Postgres — nothing above this layer changes.

const DATA_DIR = path.join(process.cwd(), "data");
const FILES: (keyof Db)[] = [
  "transactions",
  "rules",
  "overrides",
  "shares",
  "settlements",
  "subscriptions",
  "snapshots",
];

async function ensureSeeded(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(path.join(DATA_DIR, "transactions.json"));
  } catch {
    const seed = seedDb();
    await Promise.all(
      FILES.map((f) =>
        fs.writeFile(path.join(DATA_DIR, `${f}.json`), JSON.stringify(seed[f], null, 2))
      )
    );
  }
}

export async function readDb(): Promise<Db> {
  await ensureSeeded();
  const entries = await Promise.all(
    FILES.map(async (f) => {
      const raw = await fs.readFile(path.join(DATA_DIR, `${f}.json`), "utf8");
      return [f, JSON.parse(raw)] as const;
    })
  );
  return Object.fromEntries(entries) as unknown as Db;
}

export async function writeCollection<K extends keyof Db>(name: K, value: Db[K]): Promise<void> {
  await ensureSeeded();
  await fs.writeFile(path.join(DATA_DIR, `${name}.json`), JSON.stringify(value, null, 2));
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
