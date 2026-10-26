import type { Db } from "./types";
import {
  partnerShareOf,
  balance,
  categoryOf,
  categoryTotals,
  matches,
  monthKey,
  monthlyBurn,
  shareAmount,
  subscriptionStatus,
} from "./engine";
import { MOCK_BALANCES } from "./seed";
import { guessDomain, merchantOf, rulePattern, subscriptionLabel } from "./icons";
import { merchantFromDescription, type LhvAccount } from "./lhv";

export interface BoardTx {
  id: string;
  date: string;
  amount: number;
  counterparty: string; // raw bank string: rules match on it
  name: string; // statement-legible merchant name
  rulePattern: string; // what "always" would teach a rule to match on
  description: string;
  // What the second line says. Card payments carry the raw statement string
  // the merchant name was cut from (card tail, timestamp, address) — noise
  // once the name is shown, so it is dropped. Transfers keep their note.
  note: string;
  domain: string | null;
  emoji: string | null; // the owner's stand-in when there is no favicon
  // The pattern an identity set from this tile applies to; true when one already does.
  merchantPattern: string;
  customMerchant: boolean;
  category: string | null;
  categorySource: "rule" | "override" | null;
  // When it was filed: its hand-filing's time, or when the rule that files it was taught.
  // Null when loose, or filed before times were kept.
  filedAt: string | null;
  shared: boolean;
  shareId?: string;
  partnerShare?: number;
  // Set-and-forget noise (LHV micro-investing round-ups): collapsed into a
  // per-day rollup line in the feed. Math still counts the underlying rows.
  micro: boolean;
}

// A stored time as one comparable form; the database may hand back a Date or another layout.
const iso = (t: string | Date | undefined) => {
  const d = t ? new Date(t) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

export function buildBoard(db: Db, today = new Date(), lhvAccounts: LhvAccount[] = []) {
  const month = today.toISOString().slice(0, 7);
  const shareByTx = new Map(db.shares.filter((s) => s.txId).map((s) => [s.txId!, s]));

  const txs: BoardTx[] = [...db.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((tx) => {
      const override = db.overrides.find((o) => o.txId === tx.id);
      const cat = categoryOf(tx, db.rules, db.overrides);
      // "override" only when the hand-filing disagrees with the rules: an
      // "Always" drag files its own tile by override too, so a bare override
      // check would mark every teaching tile as an exception.
      const rule = db.rules.findLast((r) => matches(tx, r.match));
      const ruleCategory = rule?.category ?? null;
      const share = shareByTx.get(tx.id);
      const merchant = merchantOf(tx, db.merchants);
      const isCardString = !!merchantFromDescription(tx.description);
      // A note that only repeats the name (bank transfers often carry the
      // counterparty text again, give or take a reference) says nothing.
      const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const d = squash(tx.description);
      const redundant =
        !d || d.startsWith(squash(tx.counterparty)) || squash(tx.counterparty).startsWith(d) || d.startsWith(squash(merchant.name));
      return {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        counterparty: tx.counterparty,
        name: merchant.name,
        rulePattern: rulePattern(tx),
        description: tx.description,
        note: isCardString || redundant ? "" : tx.description.trim(),
        domain: merchant.domain,
        emoji: merchant.emoji,
        merchantPattern: merchant.match ?? rulePattern(tx),
        customMerchant: merchant.match !== null,
        micro: (tx.counterparty + " " + tx.description).toLowerCase().includes("mikroinvesteering"),
        category: cat,
        categorySource: override && override.category !== ruleCategory ? "override" : cat ? "rule" : null,
        filedAt: iso(override ? override.at : rule?.createdAt),
        shared: !!share,
        shareId: share?.id,
        partnerShare: share ? partnerShareOf(share) : undefined,
      };
    });

  const totals = categoryTotals(db, month);
  const subStatuses = db.subscriptions.map((s) => {
    // An identity whose pattern sits inside the subscription's own covers
    // every charge the subscription matches, so it names the row too.
    const own = db.merchants.findLast((m) => s.match.includes(m.match));
    return {
      ...subscriptionStatus(s, db.transactions, today),
      domain: own?.domain ?? guessDomain(s.name),
      emoji: own?.emoji ?? null,
      label: own?.name ?? subscriptionLabel(s.name),
      customMerchant: !!own,
    };
  });

  const sharedItems = [...db.shares]
    .map((s) => ({
      id: s.id,
      paidBy: s.paidBy,
      date: s.manual?.date ?? db.transactions.find((t) => t.id === s.txId)?.date ?? "",
      description:
        s.manual?.description ??
        (() => {
          const tx = db.transactions.find((t) => t.id === s.txId);
          return tx ? merchantOf(tx, db.merchants).name : "";
        })(),
      total: shareAmount(s, db.transactions),
      partnerShare: partnerShareOf(s),
      // What the couple spent it on: the transaction's category when bank-linked,
      // the optional pick on a quick-add otherwise.
      category: s.manual
        ? s.manual.category ?? null
        : (() => {
            const tx = db.transactions.find((t) => t.id === s.txId);
            return tx ? categoryOf(tx, db.rules, db.overrides) : null;
          })(),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Real LHV accounts when the sync has run; the two mock pseudo-accounts otherwise.
  // Kasvukonto (LHV's growth account) is the micro-investing pot: round-ups
  // land there and are invested straight out, so its balance says nothing —
  // it stays off the stat row. Its transactions still sync.
  const accountRows: LhvAccount[] =
    lhvAccounts.length > 0
      ? lhvAccounts.filter((a) => !/kasvukonto/i.test(a.name))
      : [
          { iban: "EE00MOCK0000000001", name: "LHV · everyday", currency: "EUR", balance: MOCK_BALANCES.everyday },
          { iban: "EE00MOCK0000000002", name: "LHV · savings", currency: "EUR", balance: MOCK_BALANCES.savings },
        ];
  const accounts = accountRows.slice(0, 2).map((a) => ({
    name: lhvAccounts.length > 0 ? `LHV · ${a.name}` : a.name,
    iban: a.iban,
    balance: a.balance,
  }));

  // Investments: two manually snapshotted pots. The series carries each pot's
  // latest known value forward, so the combined total is defined at every
  // snapshot time even when only one pot was updated.
  const snapSorted = [...db.snapshots].sort((a, b) => a.at.localeCompare(b.at));
  const sourceOf = (s: { source?: string }) => (s.source === "lhv" ? "lhv" : "lightyear");
  const latestBySource = {
    lightyear: snapSorted.filter((s) => sourceOf(s) === "lightyear").at(-1) ?? null,
    lhv: snapSorted.filter((s) => sourceOf(s) === "lhv").at(-1) ?? null,
  };
  const investmentSeries: { at: string; lightyear: number | null; lhv: number | null; total: number }[] = [];
  let carryLy: number | null = null;
  let carryLhv: number | null = null;
  for (const s of snapSorted) {
    if (sourceOf(s) === "lhv") carryLhv = s.total;
    else carryLy = s.total;
    investmentSeries.push({
      at: s.at,
      lightyear: carryLy,
      lhv: carryLhv,
      total: Math.round(((carryLy ?? 0) + (carryLhv ?? 0)) * 100) / 100,
    });
  }

  const bal = balance(db.shares, db.settlements, db.transactions);

  return {
    month,
    txs,
    categories: db.categories.map((c) => ({
      name: c.name,
      budget: c.budget ?? null,
      total: Math.round((totals[c.name] ?? 0) * 100) / 100,
    })),
    // Round-ups are money moved, not spent: never something to file (as the To file filter has it).
    uncategorizedCount: txs.filter((t) => !t.category && t.amount < 0 && !t.micro).length,
    balance: bal,
    sharedItems,
    settlements: db.settlements,
    subscriptions: subStatuses,
    monthlyBurn: monthlyBurn(subStatuses),
    investments: {
      total: investmentSeries.at(-1)?.total ?? null,
      latest: latestBySource,
    },
    accounts,
  };
}

export type Board = ReturnType<typeof buildBoard>;
export { monthKey };

// The board as it travels to the page: a charge leaves out what it would say anyway (no category,
// not shared, no emoji, an empty note…), and its merchant pattern when that is its rule pattern.
// At 2,000 charges that is about a third of the data. unpackBoard puts it all back.
const SAYS_ANYWAY = {
  note: "",
  domain: null,
  emoji: null,
  customMerchant: false,
  category: null,
  categorySource: null,
  filedAt: null,
  shared: false,
  micro: false,
} satisfies Partial<BoardTx>;
type PackedTx = Omit<BoardTx, keyof typeof SAYS_ANYWAY | "merchantPattern"> &
  Partial<Pick<BoardTx, keyof typeof SAYS_ANYWAY | "merchantPattern">>;
export type PackedBoard = Omit<Board, "txs"> & { txs: PackedTx[] };

export function packBoard(board: Board): PackedBoard {
  const txs = board.txs.map((t) => {
    const packed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(t)) {
      const anyway = key in SAYS_ANYWAY && SAYS_ANYWAY[key as keyof typeof SAYS_ANYWAY] === value;
      if (value !== undefined && !anyway && !(key === "merchantPattern" && value === t.rulePattern)) packed[key] = value;
    }
    return packed as PackedTx;
  });
  return { ...board, txs };
}

export function unpackBoard(packed: PackedBoard): Board {
  return { ...packed, txs: packed.txs.map((t) => ({ ...SAYS_ANYWAY, merchantPattern: t.rulePattern, ...t })) };
}
