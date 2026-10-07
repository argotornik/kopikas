"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { act } from "@/lib/act";
import { runSync, type SyncOutcome } from "@/lib/sync-report";
import { cn } from "@/lib/utils";
import { Field, Pending } from "@/components/form-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

  return (
    <>
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">LHV connection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4">
          <p className="text-xs text-muted-foreground">
            Sign in at{" "}
            <a href="https://api.lhv.ai/api-access" className="underline" target="_blank" rel="noreferrer">
              api.lhv.ai/api-access
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            with Smart-ID, Mobile-ID or ID-card, allow the two read-only permissions (accounts and transactions),
            and paste the refresh token it shows. Kopikas can see balances and transactions; it cannot make
            payments. The token renews itself with every sync and lapses only after 30 days without one
            {encrypted ? "; it is kept encrypted and never shown again." : "."}
          </p>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveToken();
            }}
          >
            <div className="min-w-0 flex-1">
              <Field label="Refresh token">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    aria-describedby="token-status"
                    name="lhv-refresh-token"
                    autoComplete="off"
                    spellCheck={false}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Button type="submit" disabled={saving}>
              <Pending on={saving}>{saving ? "Checking with LHV…" : "Save"}</Pending>
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Token last renewed <span className="font-mono">{when(tokenUpdatedAt)}</span> ·{" "}
            <span className="font-mono tabular-nums">{accountCount}</span> {accountCount === 1 ? "account" : "accounts"} · last
            synced <span className="font-mono">{when(accountsFetchedAt)}</span>
          </p>
          <div id="token-status" aria-live="polite">
            <StatusLine status={saveStatus} />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Sync</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4">
          <p className="text-xs text-muted-foreground">
            Runs by itself every morning at {cronTime()} (Tallinn time), and every hour if the GitHub workflow
            from the README is set up. Running it now is safe: nothing is fetched twice.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void syncNow()} disabled={syncing || !stored}>
              <Pending on={syncing}>{syncing ? "Syncing…" : "Sync now"}</Pending>
            </Button>
            {/* Said in words, since a disabled button's tooltip never shows. */}
            {!stored && <span className="text-xs text-muted-foreground">Store a token first.</span>}
          </div>
          <div aria-live="polite">
            <StatusLine status={syncStatus} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// One sentence for what happened; the raw report folded away beneath it.
function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-start gap-1.5 text-xs leading-snug text-foreground">
        {status.tone !== "ok" && (
          <CircleAlertIcon
            aria-hidden
            className={cn("mt-px size-3.5 shrink-0", status.tone === "error" ? "text-destructive" : "text-attention")}
          />
        )}
        <span>{status.text}</span>
      </p>
      {status.detail && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground pointer-coarse:py-3">Technical details</summary>
          <pre className="mt-1.5 overflow-x-auto rounded-md bg-muted p-3 font-mono">{status.detail}</pre>
        </details>
      )}
    </div>
  );
}
