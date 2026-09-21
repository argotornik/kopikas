import { test } from "node:test";
import assert from "node:assert/strict";
import { displayName, identifyMerchant, merchantOf, rulePattern, subscriptionLabel } from "../lib/icons.ts";
import { tx } from "./helpers.ts";

test("identifyMerchant: known merchants by token, id-only counterparties by description, domains by token", () => {
  assert.deepEqual(identifyMerchant("BOLT.EU/O/2607"), { domain: "bolt.eu", name: "Bolt" });
  assert.deepEqual(identifyMerchant("3902611", "(..3696) 2026-08-30 17:39 SELVER TALLINN \\ESTONIA"), { domain: "selver.ee", name: "Selver" });
  assert.deepEqual(identifyMerchant("PAYPAL *PATREON INC M"), { domain: "patreon.com", name: "Patreon" });
  assert.equal(identifyMerchant("someshop.ee tallinn").domain, "someshop.ee");
});

test("displayName tidies shouting strings and keeps names someone already wrote", () => {
  assert.equal(displayName("SOLARISE TOIDUPOOD OÜ"), "Solarise Toidupood OÜ");
  assert.equal(displayName("MON*Natty"), "MON*Natty");
  assert.equal(displayName("SWEDBANK AS (laenuleping nr EAL-2025-1"), "Swedbank AS");
  assert.equal(displayName("Teenus (..3696) kuutasu"), "Teenus kuutasu");
});

test("rulePattern: the merchant token when known, the counterparty minus per-charge noise otherwise", () => {
  assert.equal(rulePattern(tx("2026-09-01", -5, "BOLT.EU/O/2607")), "bolt");
  assert.equal(rulePattern(tx("2026-09-01", -89, "Zone Media OÜ 09-2026")), "zone media oü");
  assert.equal(rulePattern(tx("2026-09-01", -500, "SWEDBANK AS (laenuleping nr EAL-2025-1")), "swedbank as");
  const t = tx("2026-09-01", -5, "Pesumaja Puhas OÜ");
  assert.equal(rulePattern(t), "pesumaja puhas oü");
});

test("subscriptionLabel keeps a chosen name and treats a raw bank string as a merchant", () => {
  assert.equal(subscriptionLabel("Infuse Pro"), "Infuse Pro");
  assert.equal(subscriptionLabel("Kaardi (..3696) kuutasu 06-2026"), "Kaardi kuutasu");
  assert.equal(subscriptionLabel("NETFLIX.COM"), "Netflix");
});

test("merchantOf: the owner's identity wins over the table, newest first", () => {
  const t = tx("2026-09-01", -5, "VIIMSI DELICE ISETEENI");
  assert.deepEqual(merchantOf(t, []), { domain: "delice.ee", name: "Delice", emoji: null, match: null });
  const merchants = [
    { id: "a", match: "delice", name: "Corner shop", emoji: "🥖", createdAt: "2026-01-01" },
    { id: "b", match: "viimsi delice", name: "Delice Viimsi", domain: "delice.ee", createdAt: "2026-02-01" },
  ];
  assert.deepEqual(merchantOf(t, merchants), { name: "Delice Viimsi", domain: "delice.ee", emoji: null, match: "viimsi delice" });
});
