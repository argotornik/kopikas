import { BlobNotFoundError, del, head, list, put } from "@vercel/blob";
import { readDb } from "./storage";

// A copy of the board once a day in the private Blob store connected to the project, the last
// 30 days kept, since Neon's free plan keeps only six hours of history. It holds everything the
// household decided (categories, filings, rules, splits, repayments, subscriptions, names and
// icons, investment snapshots) and the charges those point at, so a copy stands on its own, in
// the shape of the local data/ folder: one key per file there. The LHV token and the balances
// stay out: the token is pasted again, the balances come with the next sync.
const KEEP_DAYS = 30;
const DIR = "backups/";

// What happened, for the sync's reply: Actions logs of a public repository are public, so it
// names the file and never the store's URL.
export type BackupResult = "off" | "already" | { saved: string; removed: number } | { error: string };

export async function backUpOnceADay(now = new Date()): Promise<BackupResult> {
  // No Blob store connected to the project: nowhere to keep a copy.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return "off";
  const day = now.toISOString().slice(0, 10);
  const pathname = `${DIR}${day}.json`;
  try {
    try {
      await head(pathname);
      return "already";
    } catch (e) {
      if (!(e instanceof BlobNotFoundError)) throw e;
    }
    const db = await readDb();
    await put(pathname, JSON.stringify({ takenAt: now.toISOString(), ...db }), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    // Older than 30 days: let go. Names sort by day.
    const oldest = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
    const { blobs } = await list({ prefix: DIR });
    const old = blobs.filter((b) => b.pathname.slice(DIR.length) < oldest).map((b) => b.url);
    if (old.length > 0) await del(old);
    return { saved: pathname, removed: old.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
