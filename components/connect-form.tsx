"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase =
  | { step: "idle" }
  | { step: "saving" }
  | { step: "syncing" }
  | { step: "opening"; rows: number }
  | { step: "failed"; message: string; detail?: string };

type SyncReport = { ok?: boolean; error?: string; mapped?: number; refreshGrant?: string };

// Paste the token, press Connect: the token is stored, the first sync runs,
// and the board opens when rows arrive. One action instead of save, sync,
// read the report, reload.
export function ConnectForm({ hasToken }: { hasToken: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [stored, setStored] = useState(hasToken);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const busy = phase.step === "saving" || phase.step === "syncing" || phase.step === "opening";

  const sync = async () => {
    setPhase({ step: "syncing" });
    let report: SyncReport;
    try {
      report = (await (await fetch("/api/sync", { method: "POST" })).json()) as SyncReport;
    } catch {
      report = { ok: false, error: "The sync did not answer." };
    }
    if (!report.ok) {
      return setPhase({ step: "failed", message: "LHV did not accept the token.", detail: report.error ?? report.refreshGrant });
    }
    const rows = report.mapped ?? 0;
    if (rows === 0) {
      return setPhase({
        step: "failed",
        message: "LHV answered, but no transactions came back for the last 90 days. The token is stored and the hourly sync keeps trying.",
      });
    }
    setPhase({ step: "opening", rows });
    router.refresh();
  };

  const connect = async () => {
    const value = token.trim();
    if (!value) return setPhase({ step: "failed", message: "Paste the refresh token first." });
    setPhase({ step: "saving" });
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "set-lhv-token", refreshToken: value }),
    });
    if (!res.ok) return setPhase({ step: "failed", message: "The token could not be stored. Try again." });
    setToken("");
    setStored(true);
    await sync();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="Paste refresh token"
          aria-label="LHV refresh token"
          name="lhv-refresh-token"
          autoComplete="off"
          spellCheck={false}
          value={token}
          disabled={busy}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void connect();
            }
          }}
        />
        <Button onClick={() => void connect()} disabled={busy || !token.trim()}>
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </div>
      <p className="min-h-4 text-sm text-muted-foreground" aria-live="polite">
        {phase.step === "saving" && "Storing the token…"}
        {phase.step === "syncing" && "Fetching the last 90 days from LHV…"}
        {phase.step === "opening" && `Fetched ${phase.rows} transactions. Opening your board…`}
        {phase.step === "failed" && <span className="text-foreground">{phase.message}</span>}
        {phase.step === "idle" && stored && "A token is already stored, but nothing has synced yet."}
      </p>
      {phase.step === "failed" && phase.detail && (
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{phase.detail}</pre>
      )}
      {stored && !busy && (
        <div>
          <Button variant="outline" onClick={() => void sync()}>
            Run the sync again
          </Button>
        </div>
      )}
    </div>
  );
}
