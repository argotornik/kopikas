import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPortfolio, merchantFromDescription } from "../lib/lhv.ts";

test("merchantFromDescription reads the merchant out of a card string, or the label when there is one", () => {
  assert.equal(merchantFromDescription("(..3696) 2026-08-30 17:39 SOLARISE TOIDUPOOD \\ESTONIA PST 9 \\TALLINN"), "SOLARISE TOIDUPOOD");
  assert.equal(merchantFromDescription("Sularaha välja: (..3696) 2026-08-22 12:33 WLEC0501 Parnu mnt 238\\TALLINN"), "Sularaha välja");
  assert.equal(merchantFromDescription("Netflix subscription"), undefined);
});

test("mapPortfolio merges positions by instrument into shares of the summary total", () => {
  const p = mapPortfolio({
    accounts: [
      { iban: "EE1", positions: [
        { symbol: "VWCE", name: "Vanguard FTSE All-World", marketValue: 600, baseCurrencyMarketValue: 600 },
        { symbol: "IWDA", name: "iShares Core MSCI World", marketValue: 300, baseCurrencyMarketValue: 300 },
      ] },
      { iban: "EE2", positions: [{ symbol: "VWCE", name: "Vanguard FTSE All-World", currency: "USD", marketValue: 130, baseCurrencyMarketValue: 120 }] },
    ],
    summary: { totalValue: 1020, totalChangePercentage: 5.699, baseCurrency: "EUR" },
  });
  assert.deepEqual(p, {
    total: 1020,
    returnPct: 5.7,
    holdings: [{ name: "Vanguard FTSE All-World", pct: 71 }, { name: "iShares Core MSCI World", pct: 29 }],
    positions: 2,
  });
  assert.equal(mapPortfolio({ accounts: [], summary: {} }), null);
  assert.equal(mapPortfolio(null), null);
});
