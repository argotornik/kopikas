"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { act } from "@/lib/act";
import { runSync, type SyncOutcome } from "@/lib/sync-report";
import { cn } from "@/lib/utils";
import { Pending } from "@/components/form-status";
import { TokenField } from "@/components/token-field";
import { CARD, DISPLAY, FOCUS, INK, INK_TEXT, MUTED, OAT, PANEL, PILL, WHITE } from "@/components/coin-look";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "never");
// The Vercel cron's 05:00 UTC, as the household reads a clock: 08:00 in
// summer, 07:00 in winter. Fixed to Tallinn so server and browser agree.
const cronTime = () => {
  const now = new Date();
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Tallinn" }).format(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5))
  );
};

type Status = { tone: "ok" | "warn" | "error"; text: string; detail?: string } | null;

export function SettingsForm({
  tokenUpdatedAt,
  accountCount,
  accountsFetchedAt,
  encrypted,
}: {
  tokenUpdatedAt: string | null;
  accountCount: number;
  accountsFetchedAt: string | null;
  encrypted: boolean; // a database holds the token, sealed; the dev JSON store does not
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [saveStatus, setSaveStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncOutcome | null>(null);
  // Sync needs a token; the button waits for one stored earlier or saved just now.
  const [stored, setStored] = useState(!!tokenUpdatedAt);
  // The token's form: open until one is stored, then only for replacing it.
  const [tokenOpen, setTokenOpen] = useState(!tokenUpdatedAt);

  // The server tries the token with LHV before it replaces anything, so a
  // refusal leaves the working token in place — and the pasted one in the
  // field, to correct rather than paste again.
  const saveToken = async () => {
    if (saving) return;
    if (!token.trim()) return setSaveStatus({ tone: "error", text: "Paste the refresh token first." });
    setSaving(true);
    setSaveStatus(null);
    const result = await act({ type: "set-lhv-token", refreshToken: token });
    setSaving(false);
    if (!result.ok) return setSaveStatus({ tone: "error", text: result.error });
    setToken("");
    setStored(true);
    setTokenOpen(false);
    setSaveStatus({ tone: "ok", text: "Saved. LHV accepted the token; run a sync to fetch the latest." });
    router.refresh(); // the "Token stored" line below reads the server
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const outcome = await runSync();
    setSyncing(false);
    setSyncStatus(outcome);
    if (outcome.tone !== "error") router.refresh();
  };

  // Overdue past the daily cron's day plus slack. Read after mount, since the
  // server's clock is not the reader's.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const overdue = now !== null && accountsFetchedAt !== null && now - Date.parse(accountsFetchedAt) > 26 * 3600_000;
  const state = !stored ? "none" : !accountsFetchedAt ? "unsynced" : overdue ? "overdue" : "ok";

  // One block for the connection: its state first, with what changes it beside it; the
  // token's form, needed once, under it.
  return (
    <section id="connection" aria-labelledby="connection-heading" className={cn(PANEL, OAT, "scroll-mt-4 p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h2 id="connection-heading" className={cn(DISPLAY, "text-[20px] font-semibold")}>
            LHV connection
          </h2>
          <p className="mt-2 flex items-center gap-2 text-[15px] font-medium">
            <span
              aria-hidden
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                state === "ok" ? "bg-received dark:bg-received-night" : state === "none" ? "bg-muted-text/40 dark:bg-muted-text-night/40" : "bg-sun"
              )}
            />
            {state === "none"
              ? "Not connected yet"
              : state === "unsynced"
                ? "Connected, not synced yet"
                : state === "overdue"
                  ? "Connected, but the last sync is overdue"
                  : "Connected"}
          </p>
          {stored && (
            <p className={cn("mt-0.5 text-[13px]", MUTED)}>
              <span className="tabular-nums">{accountCount}</span> {accountCount === 1 ? "account" : "accounts"} · last synced{" "}
              <span className="tabular-nums">{when(accountsFetchedAt)}</span> · token renewed{" "}
              <span className="tabular-nums">{when(tokenUpdatedAt)}</span>
            </p>
          )}
        </div>
        {stored && (
          // Stacked on a phone, Sync now on top; side by side from 640px.
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              aria-expanded={tokenOpen}
              aria-controls="token-section"
              onClick={() => setTokenOpen((o) => !o)}
              className={cn(PILL, WHITE, "whitespace-nowrap", FOCUS)}
            >
              Replace the token
            </button>
            <button type="button" onClick={() => void syncNow()} disabled={syncing} className={cn(PILL, INK, "inline-flex items-center justify-center gap-2 whitespace-nowrap", FOCUS)}>
              <Pending on={syncing}>{syncing ? "Syncing…" : "Sync now"}</Pending>
            </button>
          </div>
        )}
      </div>
      <div aria-live="polite">
        {syncStatus && (
          <div className="mt-3">
            <StatusLine status={syncStatus} />
          </div>
        )}
      </div>
      {stored && (
        <p className={cn("mt-3 max-w-[72ch] text-[13px]", MUTED)}>
          Syncs by itself every morning at {cronTime()} (Tallinn time), and every hour if the GitHub workflow from the
          README is set up. Running it now is safe: nothing is fetched twice.
        </p>
      )}
      {tokenOpen && (
        <div id="token-section" className={cn("mt-4 rounded-2xl p-4", CARD)}>
          <h3 className="text-[15px] font-medium">{stored ? "Replace the token" : "Connect LHV"}</h3>
          <p className={cn("mt-1 max-w-[72ch] text-[13px]", MUTED)}>
            Sign in at{" "}
            <a href="https://api.lhv.ai/api-access" className={cn("underline underline-offset-2", INK_TEXT, FOCUS)} target="_blank" rel="noreferrer">
              api.lhv.ai/api-access
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            with Smart-ID, Mobile-ID or ID-card, allow the two read-only permissions (accounts and transactions), and
            paste the refresh token it shows. Kopikas can see balances and transactions; it cannot make payments. The
            token renews itself with every sync and lapses only after 30 days without one
            {encrypted ? "; it is kept encrypted and never shown again." : "."}
          </p>
          <div className="mt-3">
            <TokenField
              value={token}
              onChange={setToken}
              onSubmit={() => void saveToken()}
              busy={saving}
              label="Save"
              busyLabel="Checking with LHV…"
              describedBy="token-status"
            />
          </div>
        </div>
      )}
      {/* Outside the form: a saved token closes it, and the word "Saved" must still show. */}
      <div id="token-status" aria-live="polite">
        {saveStatus && (
          <div className="mt-3">
            <StatusLine status={saveStatus} />
          </div>
        )}
      </div>
    </section>
  );
}

// One sentence for what happened; the raw report folded away beneath it.
function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-start gap-1.5 text-[13px] leading-snug">
        {status.tone !== "ok" && (
          <CircleAlertIcon
            aria-hidden
            className={cn("mt-px size-4 shrink-0", status.tone === "error" ? "text-stamp dark:text-stamp-night" : "text-sun-ink dark:text-sun")}
          />
        )}
        <span>{status.text}</span>
      </p>
      {status.detail && (
        <details className={cn("text-[13px]", MUTED)}>
          <summary className={cn("w-fit cursor-pointer select-none rounded-full hover:underline pointer-coarse:py-3", FOCUS)}>Technical details</summary>
          <pre className={cn("mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-2xl p-3 text-[12px]", CARD)}>{status.detail}</pre>
        </details>
      )}
    </div>
  );
}
