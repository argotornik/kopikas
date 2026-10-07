"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { act } from "@/lib/act";
import { runSync, type SyncOutcome } from "@/lib/sync-report";
import { cn } from "@/lib/utils";
import { Pending } from "@/components/form-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "never");

type Status = { tone: "ok" | "warn" | "error"; text: string; detail?: string } | null;

export function SettingsForm({
  tokenUpdatedAt,
  accountCount,
  accountsFetchedAt,
}: {
  tokenUpdatedAt: string | null;
  accountCount: number;
  accountsFetchedAt: string | null;
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
            Get a refresh token with Smart-ID at{" "}
            <a href="https://api.lhv.ai/api-access" className="underline" target="_blank" rel="noreferrer">
              api.lhv.ai/api-access
            </a>{" "}
            (scopes: accounts + transactions, read-only). The token renews itself on every sync and only
            expires after 30 days without one. If a sync ever fails with a refresh error, come back here with
            a fresh token. Stored encrypted; never shown again.
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveToken();
            }}
          >
            <Input
              type="password"
              placeholder="Paste refresh token"
              aria-label="LHV refresh token"
              aria-describedby="token-status"
              name="lhv-refresh-token"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button type="submit" disabled={saving}>
              <Pending on={saving}>{saving ? "Checking with LHV…" : "Save"}</Pending>
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Token stored: <span className="font-mono">{when(tokenUpdatedAt)}</span> · Accounts known:{" "}
            <span className="font-mono tabular-nums">{accountCount}</span> · Balances fetched:{" "}
            <span className="font-mono">{when(accountsFetchedAt)}</span>
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
            Runs by itself every morning at 05:00 UTC from Vercel, and every hour once the optional GitHub
            Actions workflow from the README is set up. Running it by hand any time is harmless; a sync never
            duplicates anything.
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
