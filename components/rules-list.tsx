"use client";

import { useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { DISPLAY, FOCUS, MUTED, PANEL, wrapperOf } from "@/components/coin-stage";
import { CARD, OAT } from "@/components/coin-look";
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

// Every rule the board has been taught, a card per category it files into, in the
// board's order and colours, newest first within each; each rule a chip with how many
// charges it matches. The rules that match nothing come first, on their own: they are
// the ones worth pruning. A filter narrows a long list by pattern or category.
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
      ? [{ key: "duds", title: "Matching nothing", note: "No charge matches these; safe to forget.", rules: duds }]
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
    announceUndoable(`Forgot “${r.match}”, which filed as ${r.category}.`, result.undo, () =>
      setRules((rs) => [...rs.filter((x) => x.id !== r.id), r].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    );
  };

  const colourOf = (category: string) => wrapperOf(categories.map((name) => ({ name })), category, true);
  const charges = (n: number) => `${n} ${n === 1 ? "charge matches" : "charges match"}`;
  const chip = (r: RuleRow, withCategory: boolean) => (
    <RuleChip
      key={r.id}
      onWhite={!withCategory}
      title={`${r.match} files as ${r.category} · ${r.matches === 0 ? "no charge matches" : charges(r.matches)} · added ${taught(r.createdAt)}`}
      removeLabel={`Forget rule ${r.match}: files as ${r.category}, ${r.matches === 0 ? "no charge matches" : charges(r.matches)}, added ${taught(r.createdAt)}`}
      focusKey="forget"
      busy={busy.has(r.id)}
      onRemove={(from) => void forget(r, from)}
    >
      {withCategory && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: colourOf(r.category) }} />}
      <span className="truncate font-medium">{r.match}</span>
      {withCategory ? (
        <span className={cn("shrink-0 text-[13px]", MUTED)}>{r.category}</span>
      ) : (
        <span className={cn("shrink-0 text-[13px] tabular-nums", MUTED)}>{r.matches}</span>
      )}
    </RuleChip>
  );
  const dudGroup = groups.find((g) => g.key === "duds");
  const cards = groups.filter((g) => g.key !== "duds");

  return (
    <section id="filing-rules" aria-labelledby="filing-rules-heading" className={cn(PANEL, OAT, "scroll-mt-4 p-4 sm:p-6")}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="filing-rules-heading" className={cn(DISPLAY, "text-[20px] font-semibold")}>
          Filing rules
        </h2>
        <span className={cn("text-[15px] tabular-nums", MUTED)}>{rules.length}</span>
      </div>
      <p className={cn("mt-1 max-w-[80ch] px-1 text-[13px]", MUTED)}>
        Made when you choose Always while filing a charge; the number on a rule is how many charges it matches. When two
        rules match, the newer one wins. The ✕ forgets a rule and un-files what it filed; Undo puts it back.
      </p>
      {rules.length === 0 && (
        <p className={cn("mt-3 px-1 text-[15px]", MUTED)}>No filing rules yet. Choose Always while filing a charge and the rule appears here.</p>
      )}
      {rules.length > 8 && (
        <div className="relative mt-4 max-w-md">
          <SearchIcon aria-hidden className={cn("pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2", MUTED)} />
          <input
            type="search"
            name="find-rule"
            aria-label="Find a rule"
            placeholder="Find a rule, like bolt or Groceries"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "h-11 w-full rounded-full border-2 border-transparent bg-white pl-10 pr-4 text-[15px] placeholder:text-[#63666F] focus:border-[#16171C]/20 dark:bg-[#23252E] dark:placeholder:text-[#A7A9B4] dark:focus:border-white/25 [&::-webkit-search-cancel-button]:hidden",
              FOCUS
            )}
          />
        </div>
      )}
      {rules.length > 0 && visible.length === 0 && <p className={cn("mt-3 px-1 text-[15px]", MUTED)}>No rule matches “{query.trim()}”.</p>}
      <div className="mt-4 outline-none" data-list>
        {dudGroup && (
          <section aria-label={`${dudGroup.title}, ${dudGroup.rules.length}`} className="mb-3 rounded-[20px] border-2 border-dashed border-[#16171C]/20 p-4 dark:border-white/20">
            <h3 className="text-[15px] font-medium">
              Matching nothing <span className={cn("font-normal tabular-nums", MUTED)}>· {dudGroup.rules.length}</span>
            </h3>
            <p className={cn("text-[13px]", MUTED)}>{dudGroup.note}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">{dudGroup.rules.map((r) => chip(r, true))}</ul>
          </section>
        )}
        {/* Cards flow into columns by their height, so a short one never leaves a hole beside a tall one. */}
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {cards.map((g) => (
            <section key={g.key} aria-label={`${g.title}, ${g.rules.length}`} className={cn("mb-3 break-inside-avoid rounded-[20px] p-4", CARD)}>
              <h3 className="flex items-center gap-2.5 text-[15px] font-medium">
                <span aria-hidden className="h-6 w-7 shrink-0 rounded-[9px]" style={{ background: colourOf(g.title) }} />
                <span className="min-w-0 flex-1 truncate">{g.title}</span>
                <span className={cn("text-[13px] font-normal tabular-nums", MUTED)}>{g.rules.length}</span>
              </h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">{g.rules.map((r) => chip(r, false))}</ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

// A rule as a chip: what it matches, a figure, and a ✕ that is 24px to see and,
// on touch, a 44px place to press. The full sentence is in its title and the ✕'s name.
export function RuleChip({
  title,
  removeLabel,
  focusKey,
  busy,
  onRemove,
  onWhite = false,
  children,
}: {
  title: string;
  removeLabel: string;
  focusKey: string;
  busy: boolean;
  onRemove: (from: HTMLElement) => void;
  // On an Oat panel the chip is white; in a white card it is Oat.
  onWhite?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      data-row
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-3 pr-1 text-[14px]",
        onWhite ? "bg-[#EFEBE3] dark:bg-[#1F1D22]" : CARD
      )}
    >
      {children}
      <button
        type="button"
        aria-label={removeLabel}
        data-focus-key={focusKey}
        disabled={busy}
        onClick={(e) => onRemove(e.currentTarget)}
        className={cn(
          "relative flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-[#16171C]/10 hover:text-[#16171C] disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5 pointer-coarse:after:content-['']",
          MUTED,
          FOCUS
        )}
      >
        <XIcon aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}
