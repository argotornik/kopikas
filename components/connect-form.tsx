"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { CircleAlertIcon } from "lucide-react";
import { act } from "@/lib/act";
import { runSync } from "@/lib/sync-report";
import { cn } from "@/lib/utils";
import { Field } from "@/components/form-status";
import { CoinMark } from "@/components/coin-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase =
  | { step: "idle" }
  | { step: "saving" }
  | { step: "syncing" }
  | { step: "opening"; rows: number }
  | { step: "failed"; message: string; detail?: string }
  // Connected, but LHV had no transactions in the window: nothing is wrong
  // with the token, so it does not wear the failure's amber.
  | { step: "empty" };

// Paste the token, press Connect: the token is stored, the first sync runs,
// and the board opens when rows arrive. One action instead of save, sync,
// read the report, reload.
export function ConnectForm({ hasToken }: { hasToken: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [stored, setStored] = useState(hasToken);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const busy = phase.step === "saving" || phase.step === "syncing" || phase.step === "opening";

  // Each failure says its own cause: a dead network, an expired sign-in or a
  // timeout is not the token's fault, and only a refusal sends you back to LHV.
  const sync = async () => {
    setPhase({ step: "syncing" });
    const outcome = await runSync();
    if (outcome.tone === "error") {
      return setPhase({ step: "failed", message: outcome.text, detail: outcome.detail });
    }
    const rows = outcome.rows;
    if (rows === 0) return setPhase({ step: "empty" });
    setPhase({ step: "opening", rows });
    // The board opens on its first fill: the feed cascades in once.
    router.replace("/?welcome=1");
  };

  const connect = async () => {
    if (busy) return;
    const value = token.trim();
    if (!value) return setPhase({ step: "failed", message: "Paste the refresh token first." });
    setPhase({ step: "saving" });
    // The server checks the token with LHV before storing it; whatever goes
    // wrong comes back as a sentence, and the form is usable again.
    const result = await act({ type: "set-lhv-token", refreshToken: value });
    if (!result.ok) return setPhase({ step: "failed", message: result.error });
    setToken("");
    setStored(true);
    await sync();
  };

  // One line says where the connection is. It slides between states, and a
  // failure takes the board's amber so it reads as the thing to deal with.
  const status =
    phase.step === "saving"
      ? { key: "saving", text: "Checking the token with LHV…" }
      : phase.step === "syncing"
        ? { key: "syncing", text: "Fetching the last 90 days from LHV…" }
        : phase.step === "opening"
          ? { key: "opening", text: `Fetched ${phase.rows} transactions. Opening your board…` }
          : phase.step === "failed"
            ? { key: `failed:${phase.message}`, text: phase.message, failed: true }
            : phase.step === "empty"
              ? {
                  key: "empty",
                  text: "Connected. LHV had no transactions from the last 90 days, so the board stays empty for now; the hourly sync keeps checking.",
                }
              : stored
              ? { key: "stored", text: "A token is already stored, but nothing has synced yet." }
              : null;

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Refresh token">
            {(id) => (
              <Input
                id={id}
                type="password"
                name="lhv-refresh-token"
                autoComplete="off"
                spellCheck={false}
                value={token}
                disabled={busy}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) {
                    e.preventDefault();
                    void connect();
                  }
                }}
              />
            )}
          </Field>
        </div>
        <Button onClick={() => void connect()} disabled={busy || !token.trim()}>
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </div>
      <p className="min-h-4 text-sm text-muted-foreground" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {status && (
            <motion.span
              key={status.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "flex items-center gap-2",
                // The board's amber marks it as the thing to deal with; the
                // words stay at full contrast on the tint.
                status.failed && "items-start rounded-md bg-attention/15 px-2.5 py-1.5 text-foreground"
              )}
            >
              {busy && <CoinMark turning className="size-4" />}
              {status.failed && <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-attention" />}
              <span>{status.text}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </p>
      {phase.step === "failed" && phase.detail && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground pointer-coarse:py-3">Technical details</summary>
          <pre className="mt-1.5 overflow-x-auto rounded-md bg-muted p-3 font-mono">{phase.detail}</pre>
        </details>
      )}
      {stored && !busy && (
        <div>
          <Button variant="outline" onClick={() => void sync()}>
            {phase.step === "failed" || phase.step === "empty" ? "Try the sync again" : "Run the first sync"}
          </Button>
        </div>
      )}
    </div>
    </MotionConfig>
  );
}
