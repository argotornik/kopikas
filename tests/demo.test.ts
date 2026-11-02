import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDb } from "../lib/demo.ts";
import { categoryOf, subscriptionStatus } from "../lib/engine.ts";

const DAYS = ["2026-11-02", "2026-11-15", "2026-12-31", "2027-02-28", "2027-03-01"];

test("the demo household is the same on every visit to the same day", () => {
  const day = new Date("2026-11-02T08:00:00Z");
  assert.deepEqual(demoDb(day), demoDb(new Date("2026-11-02T22:00:00Z")));
});

for (const day of DAYS) {
  test(`on ${day} nothing is dated after today, and the month on show has loose change, the dry cleaner's among it`, () => {
    const today = new Date(`${day}T12:00:00Z`);
    const db = demoDb(today);
    const month = day.slice(0, 7);
    assert.ok(db.transactions.every((t) => t.date <= day));
    const loose = db.transactions.filter((t) => t.amount < 0 && !categoryOf(t, db.rules, db.overrides));
    assert.ok(loose.filter((t) => t.date.startsWith(month)).length >= 5);
    const cleaner = loose.filter((t) => t.counterparty.startsWith("Pesumaja"));
    assert.equal(cleaner.length, 5);
    assert.equal(cleaner.filter((t) => t.date.startsWith(month)).length, 2);
    assert.ok(db.transactions.filter((t) => t.date.startsWith(month)).length >= 15);
  });

  test(`on ${day} the subscriptions card has something to say: a new price, one gone quiet, one due within the week`, () => {
    const today = new Date(`${day}T12:00:00Z`);
    const db = demoDb(today);
    const status = (match: string) => subscriptionStatus(db.subscriptions.find((s) => s.match === match)!, db.transactions, today);
    assert.equal(status("netflix").priceChanged, true);
    assert.equal(status("youtube").overdue, true);
    const due = (new Date(status("spotify").nextDue!).getTime() - today.getTime()) / 86400000;
    assert.ok(due >= -1 && due <= 7, `Spotify due in ${due} days`);
  });
}
