import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../lib/apply.ts";
import { categoryOf } from "../lib/engine.ts";
import { db, tx } from "./helpers.ts";

const NOW = "2026-11-02T10:00:00.000Z";

test("filing with Always teaches the rule and pins the charge, and its Undo takes back both", () => {
  const first = tx("2026-10-03", -12, "Pesumaja Puhas OÜ");
  const second = tx("2026-10-17", -15, "Pesumaja Puhas OÜ");
  const d = db({ transactions: [first, second] });
  const filed = applyAction(d, { type: "override", txId: first.id, category: "Home", always: true }, "owner", NOW);
  assert.ok(filed.ok);
  assert.deepEqual([...filed.changed], ["rules", "overrides"]);
  assert.equal(categoryOf(second, d.rules, d.overrides), "Home");
  assert.ok(filed.undo);
  const undone = applyAction(d, filed.undo, "owner", NOW);
  assert.ok(undone.ok);
  assert.equal(d.rules.length, 0);
  assert.equal(d.overrides.length, 0);
  assert.equal(categoryOf(second, d.rules, d.overrides), null);
});

test("a refused change says why and changes nothing", () => {
  const d = db();
  const result = applyAction(d, { type: "category-add", name: "  " }, "owner", NOW);
  assert.deepEqual(result, { ok: false, error: "a short name is required" });
  assert.equal(d.categories.length, db().categories.length);
});

test("a repayment says who recorded it", () => {
  const d = db();
  const result = applyAction(d, { type: "settle", amount: 20, date: "2026-11-01" }, "partner", NOW);
  assert.ok(result.ok);
  assert.deepEqual([...result.changed], ["settlements"]);
  assert.equal(d.settlements[0].recordedBy, "partner");
});

test("connecting LHV is not a change made in memory", () => {
  const result = applyAction(db(), { type: "set-lhv-token", refreshToken: "x" }, "owner", NOW);
  assert.deepEqual(result, { ok: false, error: "unknown action" });
});

test("forgetting an Always rule un-files the charge that taught it too, and Undo brings both back", () => {
  const first = tx("2026-10-03", -12, "Pesumaja Puhas OÜ");
  const second = tx("2026-10-17", -15, "Pesumaja Puhas OÜ");
  const d = db({ transactions: [first, second] });
  applyAction(d, { type: "override", txId: first.id, category: "Home", always: true }, "owner", NOW);
  const forgot = applyAction(d, { type: "unrule", ruleId: d.rules[0].id }, "owner", "2026-11-02T11:00:00.000Z");
  assert.ok(forgot.ok);
  assert.equal(categoryOf(first, d.rules, d.overrides), null);
  assert.equal(categoryOf(second, d.rules, d.overrides), null);
  assert.ok(forgot.undo);
  assert.ok(applyAction(d, forgot.undo, "owner", "2026-11-02T11:00:05.000Z").ok);
  assert.equal(categoryOf(first, d.rules, d.overrides), "Home");
  assert.equal(categoryOf(second, d.rules, d.overrides), "Home");
  assert.equal(d.overrides[0].at, NOW);
});

test("Always from a notice, just after the tap, counts that tap as the rule's teacher", () => {
  const first = tx("2026-10-03", -12, "Pesumaja Puhas OÜ");
  const d = db({ transactions: [first] });
  applyAction(d, { type: "override", txId: first.id, category: "Home" }, "owner", NOW);
  applyAction(d, { type: "rule", txId: first.id, category: "Home" }, "owner", "2026-11-02T10:00:04.000Z");
  applyAction(d, { type: "unrule", ruleId: d.rules[0].id }, "owner", "2026-11-02T12:00:00.000Z");
  assert.equal(categoryOf(first, d.rules, d.overrides), null);
});

test("a charge filed by hand long before a rule stays filed when the rule is forgotten", () => {
  const first = tx("2026-10-03", -12, "Pesumaja Puhas OÜ");
  const second = tx("2026-10-17", -15, "Pesumaja Puhas OÜ");
  const d = db({ transactions: [first, second] });
  applyAction(d, { type: "override", txId: first.id, category: "Home" }, "owner", "2026-10-03T10:00:00.000Z");
  applyAction(d, { type: "rule", txId: second.id, category: "Home" }, "owner", NOW);
  applyAction(d, { type: "unrule", ruleId: d.rules[0].id }, "owner", "2026-11-02T12:00:00.000Z");
  assert.equal(categoryOf(first, d.rules, d.overrides), "Home");
});

test("Back to To file takes a hand-filing back, and its Undo files it where it was", () => {
  const first = tx("2026-10-03", -12, "Kohvik Komeet");
  const d = db({ transactions: [first] });
  applyAction(d, { type: "override", txId: first.id, category: "Eating out" }, "owner", NOW);
  const back = applyAction(d, { type: "unoverride", txId: first.id, previous: null }, "owner", "2026-11-02T12:00:00.000Z");
  assert.ok(back.ok);
  assert.equal(categoryOf(first, d.rules, d.overrides), null);
  assert.ok(back.undo);
  assert.ok(applyAction(d, back.undo, "owner", "2026-11-02T12:00:05.000Z").ok);
  assert.equal(categoryOf(first, d.rules, d.overrides), "Eating out");
  assert.equal(d.overrides[0].at, NOW);
});
