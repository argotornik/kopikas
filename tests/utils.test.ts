import { test } from "node:test";
import assert from "node:assert/strict";
import { amountInput, parseAmount } from "../lib/utils.ts";

test("amounts parse the way they are typed and shown here", () => {
  assert.equal(parseAmount("40,40"), 40.4);
  assert.equal(parseAmount("40.40"), 40.4);
  assert.equal(parseAmount("1 234,56 €"), 1234.56);
  assert.equal(parseAmount("1 234,56 €"), 1234.56); // et-EE formatting, copied from the board
  assert.equal(parseAmount("−12,00"), -12); // the board's minus sign
  assert.equal(parseAmount(" 5917 "), 5917);
});

test("anything that is not one plain number is NaN, never a guess", () => {
  for (const raw of ["", " ", "€", "abc", "1.234,56", "40,40,40", "12 eur", "1e3"]) {
    assert.ok(Number.isNaN(parseAmount(raw)), `${JSON.stringify(raw)} should not parse`);
  }
});

test("amountInput writes back what parseAmount reads", () => {
  assert.equal(amountInput(40.4), "40,40");
  assert.equal(parseAmount(amountInput(1234.5)), 1234.5);
});
