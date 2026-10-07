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
const taughtFmtYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const taught = (iso: string) =>
  (iso.slice(0, 4) === String(new Date().getFullYear()) ? taughtFmt : taughtFmtYear).format(new Date(iso));

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
          <span>Pooleks rules</span>
          <span className="font-mono normal-case tabular-nums">{rules.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Made when you choose Always while splitting a charge with {PARTNER_NAME}. New charges that match go
          on Pooleks at that split. Charges already there stay, even if you remove the rule.
        </p>
        {rules.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            No Pooleks rules yet. Choose Always while splitting a charge with {PARTNER_NAME} and it appears here.
          </p>
        )}
        <div className="divide-y outline-none" data-list>
          {rules.map((r) => (
            <div className="flex items-center gap-3 py-2" key={r.id} data-row>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">{r.match}</div>
                <div className="text-xs text-muted-foreground">
                  {PARTNER_NAME}&apos;s part {shareLabel(r.partnerShare)} · added {taught(r.createdAt)}
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
