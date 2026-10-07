"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { PARTNER_NAME } from "@/lib/names";
import { shareLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { act, focusAfterRemoval } from "@/lib/act";
import { announceError, announceUndoable } from "@/components/toaster";

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
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  // Same as forgetting a filing rule: one click, an Undo, focus kept on the list.
  const stop = async (r: ShareRuleRow, from: HTMLElement) => {
    if (busy.has(r.id)) return;
    setBusy((b) => new Set(b).add(r.id));
    const refocus = focusAfterRemoval(from);
    const result = await act({ type: "unshare-rule", ruleId: r.id });
    setBusy((b) => {
      const next = new Set(b);
      next.delete(r.id);
      return next;
    });
    if (!result.ok) return announceError(`Couldn't remove that rule. ${result.error}`);
    setRules((rs) => rs.filter((x) => x.id !== r.id));
    refocus();
    announceUndoable(`New “${r.match}” charges no longer go on Pooleks.`, result.undo, () =>
      setRules((rs) => [...rs.filter((x) => x.id !== r.id), r].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    );
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
        <div className="divide-y outline-none" data-list>
          {rules.map((r) => (
            <div className="flex items-center gap-3 py-2" key={r.id} data-row>
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
                data-focus-key="stop"
                disabled={busy.has(r.id)}
                onClick={(e) => void stop(r, e.currentTarget)}
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
