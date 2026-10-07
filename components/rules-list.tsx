"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { act, focusAfterRemoval } from "@/lib/act";
import { announceError, announceUndoable } from "@/components/toaster";

const taughtFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const taughtFmtYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
// "1 Sept" this year, "1 Sept 2025" before it.
const taught = (iso: string) =>
  (iso.slice(0, 4) === String(new Date().getFullYear()) ? taughtFmt : taughtFmtYear).format(new Date(iso));

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
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  // One click forgets; Undo puts the rule back where it stood in the order,
  // so nothing it filed changes hands. Focus moves to the next row's ✕.
  const forget = async (r: RuleRow, from: HTMLElement) => {
    if (busy.has(r.id)) return;
    setBusy((b) => new Set(b).add(r.id));
    const refocus = focusAfterRemoval(from);
    const result = await act({ type: "unrule", ruleId: r.id });
    setBusy((b) => {
      const next = new Set(b);
      next.delete(r.id);
      return next;
    });
    if (!result.ok) return announceError(`Couldn't forget that rule. ${result.error}`);
    setRules((rs) => rs.filter((x) => x.id !== r.id));
    refocus();
    announceUndoable(`Forgot “${r.match}” → ${r.category}.`, result.undo, () =>
      setRules((rs) => [...rs.filter((x) => x.id !== r.id), r].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    );
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-baseline justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>Filing rules</span>
          <span className="font-mono normal-case tabular-nums">{rules.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Made when you choose Always while filing a charge. When two rules match, the newer one wins.
          Forgetting a rule un-files the charges it filed; Undo puts it back.
        </p>
        {rules.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            No filing rules yet. Choose Always while filing a charge and the rule appears here.
          </p>
        )}
        <div className="divide-y outline-none" data-list>
          {rules.map((r) => (
            <div className="flex items-center gap-3 py-2" key={r.id} data-row>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">{r.match}</div>
                <div className="text-xs text-muted-foreground">
                  files as {r.category} · added {taught(r.createdAt)}
                </div>
              </div>
              <span
                className={
                  r.matches === 0
                    ? "shrink-0 text-xs font-medium text-attention"
                    : "shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                }
              >
                {r.matches === 0 ? "matches nothing" : `${r.matches} ${r.matches === 1 ? "charge matches" : "charges match"}`}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground"
                title="Forget this rule"
                aria-label={`Forget rule ${r.match} → ${r.category}`}
                data-focus-key="forget"
                disabled={busy.has(r.id)}
                onClick={(e) => void forget(r, e.currentTarget)}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
