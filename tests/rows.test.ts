import { test } from "node:test";
import assert from "node:assert/strict";
import { KEY, ORDER, applyChanges, changes, statements } from "../lib/rows.ts";
import type { Override, Rule } from "../lib/types.ts";
import { rule } from "./helpers.ts";

const filed = (txId: string, category: string): Override => ({ txId, category });

test("a save sends only the rows it added, changed or took out", () => {
  const before = [filed("a", "Home"), filed("b", "Groceries"), filed("c", "Pets")];
  const after = [filed("a", "Home"), filed("b", "Other"), filed("d", "Cash")];
  const c = changes(before, after, KEY.overrides);
  assert.deepEqual(c.put, [filed("b", "Other"), filed("d", "Cash")]);
  assert.deepEqual(c.drop, ["c"]);
  assert.deepEqual(changes(before, before, KEY.overrides), { put: [], drop: [] });
});

test("two filings read from the same board both stand, whichever saves last", () => {
  const read = [filed("a", "Home")];
  const first = changes(read, [...read, filed("b", "Groceries")], KEY.overrides);
  const second = changes(read, [...read, filed("c", "Pets")], KEY.overrides);
  const stored = applyChanges(applyChanges(read, first, KEY.overrides), second, KEY.overrides);
  assert.deepEqual(stored.map((o) => o.txId).sort(), ["a", "b", "c"]);
});

test("a stored list keeps its read order, so the newest rule still wins", () => {
  const older = rule("bolt", "Transport", "2026-01-01");
  const newer = rule("bolt food", "Eating out", "2026-03-01");
  const restored = applyChanges<Rule>([newer], { put: [older], drop: [] }, KEY.rules, ORDER.rules);
  assert.deepEqual(restored.map((r) => r.id), [older.id, newer.id]);
});

test("Postgres gets a delete per row taken out and an upsert per row put, by the table's key", () => {
  const [drop, put] = statements("overrides", { put: [{ txId: "t1", category: "Home", at: "2026-10-29T08:00:00Z" }], drop: ["t9"] });
  assert.deepEqual(drop, { text: "delete from overrides where tx_id = $1", params: ["t9"] });
  assert.equal(
    put.text,
    "insert into overrides (tx_id, category, filed_at) values ($1, $2, $3) on conflict (tx_id) do update set category = excluded.category, filed_at = excluded.filed_at"
  );
  assert.deepEqual(put.params, ["t1", "Home", "2026-10-29T08:00:00Z"]);
  const [snap] = statements("snapshots", { put: [{ id: "s1", total: 10, holdings: [{ name: "VWCE", pct: 100 }], at: "2026-10-29" }], drop: [] });
  assert.match(snap.text, /values \(\$1, \$2, \$3, \$4, \$5::jsonb, \$6, \$7\)/);
  assert.equal(snap.params[4], JSON.stringify([{ name: "VWCE", pct: 100 }]));
});
