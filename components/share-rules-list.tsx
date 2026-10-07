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
    <Card id="pooleks-rules" className="scroll-mt-4 gap-3 py-4">
      <CardHeader className="border-b px-4">
        <CardTitle className="flex items-baseline justify-between">
          <span>Pooleks rules</span>
          <span className="font-mono text-sm font-normal tracking-normal tabular-nums text-muted-foreground">{rules.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="mb-2 max-w-prose text-sm text-muted-foreground">
          Made when you choose Always while splitting a charge with {PARTNER_NAME}. New charges that match go
          on Pooleks at that split. Charges already there stay, even if you remove the rule.
        </p>
        {rules.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            No Pooleks rules yet. Choose Always while splitting a charge with {PARTNER_NAME} and it appears here.
          </p>
        )}
        {/* Same row shape as the filing rules: one line wide, the detail under the pattern on a phone. */}
        <ul className="divide-y outline-none" data-list>
          {rules.map((r) => (
            <li
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              key={r.id}
              data-row
            >
              <span className="truncate font-mono text-sm" title={r.match}>
                {r.match}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {PARTNER_NAME}&apos;s part {shareLabel(r.partnerShare)} · added {taught(r.createdAt)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="row-span-2 size-6 shrink-0 text-muted-foreground sm:row-span-1"
                title="Stop sharing new charges from this merchant"
                aria-label={`Stop sharing ${r.match} automatically`}
                data-focus-key="stop"
                disabled={busy.has(r.id)}
                onClick={(e) => void stop(r, e.currentTarget)}
              >
                <XIcon className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground sm:hidden">
                {PARTNER_NAME}&apos;s part {shareLabel(r.partnerShare)} · added {taught(r.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
