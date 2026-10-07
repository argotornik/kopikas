import type { Db, Person } from "./types";

// What Undo can put back: a record the server removed a moment ago, handed to
// the client in the removal's response and sent back as it was. It travels
// through the browser, so every field is checked again here.
export type RestoreCollection = "rules" | "shareRules" | "shares" | "settlements";

export const RESTORABLE: readonly RestoreCollection[] = ["rules", "shareRules", "shares", "settlements"];

// Puts the record back into db (mutating it). Returns the reason when the
// record is not one this collection can hold, null when it is in place —
// including when it never left, so a double-clicked Undo is harmless.
export function restoreRecord(db: Db, collection: RestoreCollection, raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return "nothing to restore";
  const r = raw as Record<string, unknown>;
  if (!text(r.id, 80)) return "the record has no id";

  switch (collection) {
    case "rules": {
      if (!text(r.match, 200) || !text(r.category, 32) || !text(r.createdAt, 40)) return "not a rule";
      if (!db.categories.some((c) => c.name === r.category)) return `${r.category} no longer exists`;
      if (db.rules.some((x) => x.id === r.id)) return null;
      insertInOrder(db.rules, { id: r.id as string, match: r.match as string, category: r.category as string, createdAt: r.createdAt as string });
      return null;
    }
    case "shareRules": {
      if (!text(r.match, 200) || !fraction(r.partnerShare) || !text(r.createdAt, 40)) return "not a share rule";
      if (db.shareRules.some((x) => x.id === r.id)) return null;
      insertInOrder(db.shareRules, {
        id: r.id as string,
        match: r.match as string,
        partnerShare: r.partnerShare as number,
        createdAt: r.createdAt as string,
      });
      return null;
    }
    case "shares": {
      if (!person(r.paidBy) || !text(r.createdAt, 40)) return "not a shared expense";
      if (r.partnerShare !== undefined && !fraction(r.partnerShare)) return "not a shared expense";
      const txId = r.txId === undefined ? undefined : (r.txId as string);
      const manual = r.manual as Record<string, unknown> | undefined;
      if (txId !== undefined) {
        if (!db.transactions.some((t) => t.id === txId)) return "that transaction is gone";
      } else if (
        !manual ||
        !isoDate(manual.date) ||
        !text(manual.description, 200) ||
        !(typeof manual.amount === "number" && manual.amount > 0) ||
        (manual.category !== undefined && !text(manual.category, 32))
      ) {
        return "not a shared expense";
      }
      if (db.shares.some((x) => x.id === r.id)) return null;
      insertInOrder(db.shares, {
        id: r.id as string,
        paidBy: r.paidBy as Person,
        ...(txId !== undefined ? { txId } : {}),
        ...(manual
          ? {
              manual: {
                date: manual.date as string,
                description: manual.description as string,
                amount: manual.amount as number,
                ...(manual.category !== undefined ? { category: manual.category as string } : {}),
              },
            }
          : {}),
        ...(r.partnerShare !== undefined ? { partnerShare: r.partnerShare as number } : {}),
        createdAt: r.createdAt as string,
      });
      return null;
    }
    case "settlements": {
      if (!(typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount !== 0) || !isoDate(r.date)) {
        return "not a repayment";
      }
      if (r.txId !== undefined && !text(r.txId, 80)) return "not a repayment";
      if (r.note !== undefined && !text(r.note, 200)) return "not a repayment";
      if (r.recordedBy !== undefined && !person(r.recordedBy)) return "not a repayment";
      if (db.settlements.some((x) => x.id === r.id)) return null;
      db.settlements.push({
        id: r.id as string,
        amount: r.amount,
        date: r.date as string,
        ...(r.txId !== undefined ? { txId: r.txId as string } : {}),
        ...(r.note !== undefined ? { note: r.note as string } : {}),
        ...(r.recordedBy !== undefined ? { recordedBy: r.recordedBy as Person } : {}),
      });
      return null;
    }
  }
}

// Rules are read newest-last (categoryOf takes the last match), so a rule put
// back must land where its createdAt says, not at the end where it would
// outrank the rules taught after it.
function insertInOrder<T extends { id: string; createdAt: string }>(list: T[], item: T): void {
  const at = list.findIndex((x) => x.createdAt > item.createdAt || (x.createdAt === item.createdAt && x.id > item.id));
  if (at < 0) list.push(item);
  else list.splice(at, 0, item);
}

const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;
const fraction = (v: unknown): v is number => typeof v === "number" && v > 0 && v < 1;
const person = (v: unknown): v is Person => v === "owner" || v === "partner";
const isoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
