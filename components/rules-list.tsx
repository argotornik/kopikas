"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const taughtFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export interface RuleRow {
  id: string;
  match: string;
  category: string;
  createdAt: string;
  matches: number; // transactions the pattern currently matches
}

// Every rule the board has been taught, newest first, with a ✕ to forget it.
// Zero-match rules are the duds worth pruning.
export function RulesList({ initial }: { initial: RuleRow[] }) {
  const [rules, setRules] = useState(initial);
  const [error, setError] = useState("");

  const forget = async (id: string) => {
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "unrule", ruleId: id }),
    });
    if (!res.ok) {
      setError("Couldn't forget that rule — try again.");
      return;
    }
    setError("");
    setRules((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-baseline justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>Rules</span>
          <span className="font-mono normal-case tabular-nums">{rules.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Taught by dragging with “Always”. Newest wins when two match the same transaction. Forgetting a
          rule un-files what it decided — drag once more to teach it again.
        </p>
        {rules.length === 0 && <p className="py-2 text-sm text-muted-foreground">No rules yet.</p>}
        <div className="divide-y">
          {rules.map((r) => (
            <div className="flex items-center gap-3 py-2" key={r.id}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">{r.match}</div>
                <div className="text-xs text-muted-foreground">
                  → {r.category} · taught {taughtFmt.format(new Date(r.createdAt))}
                </div>
              </div>
              <span
                className={
                  r.matches === 0
                    ? "shrink-0 text-xs font-medium text-attention"
                    : "shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                }
              >
                {r.matches === 0 ? "matches nothing" : `${r.matches} ${r.matches === 1 ? "match" : "matches"}`}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground"
                title="Forget this rule"
                aria-label={`Forget rule ${r.match} → ${r.category}`}
                onClick={() => void forget(r.id)}
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
