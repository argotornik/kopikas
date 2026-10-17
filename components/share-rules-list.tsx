"use client";

import { useState } from "react";
import { PARTNER_NAME } from "@/lib/names";
import { cn, shareLabel } from "@/lib/utils";
import { DISPLAY, MUTED, OAT, PANEL } from "@/components/coin-look";
import { RuleChip } from "@/components/rules-list";
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
    <section id="pooleks-rules" aria-labelledby="pooleks-rules-heading" className={cn(PANEL, OAT, "scroll-mt-4 p-4 sm:p-6")}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="pooleks-rules-heading" className={cn(DISPLAY, "text-[20px] font-semibold")}>
          Pooleks rules
        </h2>
        <span className={cn("text-[15px] tabular-nums", MUTED)}>{rules.length}</span>
      </div>
      <p className={cn("mt-1 max-w-[80ch] px-1 text-[13px]", MUTED)}>
        Made when you choose Always while splitting a charge with {PARTNER_NAME}. New charges that match go on Pooleks at
        that split. Charges already there stay, even if you remove the rule.
      </p>
      {rules.length === 0 && (
        <p className={cn("mt-3 px-1 text-[15px]", MUTED)}>
          No Pooleks rules yet. Choose Always while splitting a charge with {PARTNER_NAME} and it appears here.
        </p>
      )}
      {rules.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5 outline-none" data-list>
          {rules.map((r) => (
            <RuleChip
              key={r.id}
              title={`${r.match} · ${PARTNER_NAME}'s part ${shareLabel(r.partnerShare)} · added ${taught(r.createdAt)}`}
              removeLabel={`Stop sharing ${r.match} automatically: ${PARTNER_NAME}'s part ${shareLabel(r.partnerShare)}, added ${taught(r.createdAt)}`}
              focusKey="stop"
              busy={busy.has(r.id)}
              onRemove={(from) => void stop(r, from)}
            >
              <span className="truncate font-medium">{r.match}</span>
              <span className={cn("shrink-0 text-[13px]", MUTED)}>
                {PARTNER_NAME}&apos;s part {shareLabel(r.partnerShare)}
              </span>
            </RuleChip>
          ))}
        </ul>
      )}
    </section>
  );
}
