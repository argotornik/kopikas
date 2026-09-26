"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { PARTNER_NAME } from "@/lib/names";
import { shareLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const taughtFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export interface ShareRuleRow {
  id: string;
  match: string;
  partnerShare: number;
  createdAt: string;
}

// Merchants whose new charges land on Pooleks by themselves, newest first,
// with a ✕ to stop. Stopping leaves the shares it already made in place.
export function ShareRulesList({ initial }: { initial: ShareRuleRow[] }) {
  const [rules, setRules] = useState(initial);
  const [error, setError] = useState("");

  const stop = async (id: string) => {
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "unshare-rule", ruleId: id }),
    });
    if (!res.ok) {
      setError("Couldn't remove that rule — try again.");
      return;
    }
    setError("");
    setRules((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-baseline justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>Shared by rule</span>
          <span className="font-mono normal-case tabular-nums">{rules.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Taught by dropping on Pooleks with “Always”. Every charge that arrives from then on and matches
          goes on the statement at the split shown. Past charges are never touched, and removing a rule
          keeps what it already shared.
        </p>
        {rules.length === 0 && <p className="py-2 text-sm text-muted-foreground">No share rules yet.</p>}
        <div className="divide-y">
          {rules.map((r) => (
            <div className="flex items-center gap-3 py-2" key={r.id}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">{r.match}</div>
                <div className="text-xs text-muted-foreground">
                  {PARTNER_NAME} pays {shareLabel(r.partnerShare)} · since {taughtFmt.format(new Date(r.createdAt))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground"
                title="Stop sharing new charges from this merchant"
                aria-label={`Stop sharing ${r.match} automatically`}
                onClick={() => void stop(r.id)}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <p className="min-h-4 text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      </CardContent>
    </Card>
  );
}
