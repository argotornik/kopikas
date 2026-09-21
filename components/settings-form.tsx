"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "never");

export function SettingsForm({
  tokenUpdatedAt,
  accountCount,
  accountsFetchedAt,
}: {
  tokenUpdatedAt: string | null;
  accountCount: number;
  accountsFetchedAt: string | null;
}) {
  const [token, setToken] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  // Sync needs a token; the button waits for one stored earlier or saved just now.
  const [stored, setStored] = useState(!!tokenUpdatedAt);

  const saveToken = async () => {
    if (!token.trim()) {
      setSaveMsg("Paste the refresh token first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "set-lhv-token", refreshToken: token }),
      });
      setToken("");
      if (res.ok) setStored(true);
      setSaveMsg(res.ok ? "Token stored (encrypted). Run a sync to test it." : "Saving failed — try again.");
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      setSyncResult(JSON.stringify(json, null, 2));
    } catch (e) {
      setSyncResult(String(e));
    } finally {
      setSyncing(false);
    }
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
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Paste refresh token"
              aria-label="LHV refresh token"
              name="lhv-refresh-token"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button onClick={() => void saveToken()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Token stored: <span className="font-mono">{when(tokenUpdatedAt)}</span> · Accounts known:{" "}
            <span className="font-mono tabular-nums">{accountCount}</span> · Balances fetched:{" "}
            <span className="font-mono">{when(accountsFetchedAt)}</span>
          </p>
          <p className="min-h-4 text-xs text-foreground" aria-live="polite">
            {saveMsg}
          </p>
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
          <div>
            <Button onClick={() => void syncNow()} disabled={syncing || !stored} title={stored ? undefined : "Store a token first"}>
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
          {syncResult && (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{syncResult}</pre>
          )}
        </CardContent>
      </Card>
    </>
  );
}
