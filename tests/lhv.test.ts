import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRefreshToken, mapPortfolio, merchantFromDescription } from "../lib/lhv.ts";

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

// checkRefreshToken talks to LHV's token endpoint; these runs answer for it.
const withFetch = async (impl: typeof fetch, run: () => Promise<void>) => {
  const before = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    await run();
  } finally {
    globalThis.fetch = before;
  }
};

test("a refresh token LHV accepts is kept as the rotated one LHV hands back", async () => {
  await withFetch(
    async () => new Response(JSON.stringify({ access_token: "acc", refresh_token: "rotated" }), { status: 200 }),
    async () => {
      assert.deepEqual(await checkRefreshToken("pasted"), { ok: true, refreshToken: "rotated" });
    }
  );
});

test("a pasted access token is refused with the refresh-token hint", async () => {
  await withFetch(
    async () => new Response('{"error":"invalid_grant"}', { status: 400 }),
    async () => {
      const out = await checkRefreshToken("an-access-token");
      assert.equal(out.ok, false);
      assert.equal(!out.ok && out.reason, "refused");
      assert.match(!out.ok ? out.message : "", /refresh token, not the access token/);
    }
  );
});

test("an unreachable LHV is not a refusal, and says nothing changed", async () => {
  await withFetch(
    async () => {
      throw new TypeError("fetch failed");
    },
    async () => {
      const out = await checkRefreshToken("pasted");
      assert.equal(!out.ok && out.reason, "unreachable");
      assert.match(!out.ok ? out.message : "", /Nothing was changed/);
    }
  );
  await withFetch(
    async () => new Response("bad gateway", { status: 502 }),
    async () => assert.equal((await checkRefreshToken("pasted")).ok, false)
  );
});

test("a changed client id points at LHV_CLIENT_ID", async () => {
  await withFetch(
    async () => new Response('{"error":"invalid_client"}', { status: 401 }),
    async () => {
      const out = await checkRefreshToken("pasted");
      assert.match(!out.ok ? out.message : "", /LHV_CLIENT_ID/);
    }
  );
});
