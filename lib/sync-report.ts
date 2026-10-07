// What a sync attempt means to the person who pressed the button, read from
// what /api/sync answered. One sentence that names the cause and the next
// step; the raw report goes in `detail` for anyone who wants it.

export type SyncBody = {
  ok?: boolean;
  error?: string;
  refreshGrant?: string;
  accounts?: number;
  mapped?: number;
};

export type SyncAttempt =
  | { kind: "network" }
  | { kind: "timeout" }
  | { kind: "answer"; status: number; body: SyncBody | null; raw: string };

export type SyncOutcome = {
  tone: "ok" | "warn" | "error";
  text: string;
  detail?: string;
  rows: number; // transactions that came back; 0 on failure
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function describeSync(attempt: SyncAttempt): SyncOutcome {
  if (attempt.kind === "network") {
    return {
      tone: "error",
      text: "Couldn't reach Kopikas. Check the connection and try again; the hourly sync keeps running either way.",
      rows: 0,
    };
  }
  if (attempt.kind === "timeout") {
    return {
      tone: "error",
      text: "The sync took longer than a minute and stopped waiting. It may still finish on the server; reload in a minute to see.",
      rows: 0,
    };
  }
  const { status, body, raw } = attempt;
  if (status === 401 || status === 403) {
    return { tone: "error", text: "Your sign-in has expired. Reload the page and sign in again.", rows: 0 };
  }
  if (!body) {
    return {
      tone: "error",
      text: "The server didn't answer properly, so the sync result is unknown. The hourly sync keeps trying; try again in a minute.",
      detail: `HTTP ${status}${raw ? `\n${raw.slice(0, 300)}` : ""}`,
      rows: 0,
    };
  }
  const detail = JSON.stringify(body, null, 2);
  if (!body.ok) {
    // The refresh error ends with a hint naming both codes; match only what LHV said.
    const grant = (body.refreshGrant ?? "").replace(/\. invalid_client →[\s\S]*$/, "");
    if (/invalid_client/.test(grant)) {
      return { tone: "error", text: "LHV turned down Kopikas's client id. Set LHV_CLIENT_ID to the id LHV uses now.", detail, rows: 0 };
    }
    if (/invalid_grant|HTTP 40[01]/.test(grant)) {
      return {
        tone: "error",
        text: "LHV no longer accepts the stored token. Paste a fresh refresh token from api.lhv.ai/api-access.",
        detail,
        rows: 0,
      };
    }
    if (/No LHV token stored/.test(body.error ?? "")) {
      return { tone: "error", text: "No LHV token is stored yet. Paste one first.", rows: 0 };
    }
    return {
      tone: "error",
      text: "LHV answered with an error, so nothing new came in. The hourly sync tries again by itself.",
      detail,
      rows: 0,
    };
  }
  const rows = body.mapped ?? 0;
  const accounts = body.accounts ?? 0;
  if (body.refreshGrant) {
    // The fallback path: the stored token worked as a bearer, not as a
    // refresh token, which means it dies with its 15-minute lifetime.
    return {
      tone: "warn",
      text: `Fetched ${plural(rows, "transaction", "transactions")}, but LHV took the stored token as an access token. It stops working within about 15 minutes; paste the refresh token instead.`,
      detail,
      rows,
    };
  }
  return {
    tone: "ok",
    text:
      rows === 0
        ? "Up to date. LHV had nothing new."
        : `Fetched ${plural(rows, "transaction", "transactions")} from ${plural(accounts, "account", "accounts")}.`,
    detail,
    rows,
  };
}

// Runs /api/sync from a button and says what happened. A backfill can take
// up to the function's minute; past 65 seconds the page stops waiting
// rather than turning the coin forever.
export async function runSync(): Promise<SyncOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65_000);
  try {
    const res = await fetch("/api/sync", { method: "POST", signal: controller.signal });
    const raw = await res.text();
    let body: SyncBody | null = null;
    try {
      body = JSON.parse(raw) as SyncBody;
    } catch {}
    return describeSync({ kind: "answer", status: res.status, body, raw });
  } catch {
    return describeSync({ kind: controller.signal.aborted ? "timeout" : "network" });
  } finally {
    clearTimeout(timer);
  }
}
