"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-status";
import { cn } from "@/lib/utils";
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

// Every rule the board has been taught, grouped under the category it files
// into, in the board's order, newest first within each. The rules that match
// nothing come first, on their own: they are the ones worth pruning. A
// filter narrows a long list by pattern or category.
export function RulesList({ initial, categories }: { initial: RuleRow[]; categories: string[] }) {
  const [rules, setRules] = useState(initial);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? rules.filter((r) => r.match.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    : rules;
  const order = [...categories, ...new Set(visible.map((r) => r.category).filter((c) => !categories.includes(c)))];
  const duds = visible.filter((r) => r.matches === 0);
  const groups = [
    ...(duds.length > 0
      ? [{ key: "duds", title: "Match nothing", note: "No charge matches these; safe to forget.", rules: duds }]
      : []),
    ...order
      .map((c) => ({ key: c, title: c, note: "", rules: visible.filter((r) => r.matches > 0 && r.category === c) }))
      .filter((g) => g.rules.length > 0),
  ];

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
    <Card id="filing-rules" className="scroll-mt-4 gap-3 py-4">
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
        {rules.length > 8 && (
          <div className="mb-1">
            <Field label="Find a rule">
              {(id) => (
                <Input
                  id={id}
                  type="search"
                  placeholder="e.g. bolt, or Groceries"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
        {rules.length > 0 && visible.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">No rule matches “{query.trim()}”.</p>
        )}
        <div className="outline-none" data-list>
          {groups.map((g) => (
            <section key={g.key} aria-label={`${g.title}, ${g.rules.length}`} className="mt-4 first:mt-2">
              <h3 className="flex items-baseline justify-between border-b pb-1 text-xs font-medium text-muted-foreground">
                <span>{g.title}</span>
                <span className="font-mono tabular-nums">{g.rules.length}</span>
              </h3>
              {g.note && <p className="pt-1 text-xs text-muted-foreground">{g.note}</p>}
              <ul className="divide-y">
                {g.rules.map((r) => {
                  const meta = `${g.key === "duds" ? `files as ${r.category} · ` : ""}added ${taught(r.createdAt)}`;
                  const count = r.matches === 0 ? "" : `${r.matches} ${r.matches === 1 ? "charge matches" : "charges match"}`;
                  return (
                    // One line on a wide screen: pattern · added · matches · ✕.
                    // On a phone the pattern keeps the line and the rest goes under it.
                    <li
                      key={r.id}
                      data-row
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1.5",
                        g.key === "duds"
                          ? "sm:grid-cols-[minmax(0,1fr)_14rem_8.5rem_auto]"
                          : "sm:grid-cols-[minmax(0,1fr)_6.5rem_8.5rem_auto]"
                      )}
                    >
                      <span className="truncate font-mono text-sm" title={r.match}>
                        {r.match}
                      </span>
                      <span className="hidden truncate text-right text-xs text-muted-foreground sm:block">{meta}</span>
                      <span className="hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                        {count}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="row-span-2 size-6 shrink-0 text-muted-foreground sm:row-span-1"
                        title="Forget this rule"
                        aria-label={`Forget rule ${r.match}, files as ${r.category}`}
                        data-focus-key="forget"
                        disabled={busy.has(r.id)}
                        onClick={(e) => void forget(r, e.currentTarget)}
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {meta}
                        {count && ` · ${count}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
