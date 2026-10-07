import { test } from "node:test";
import assert from "node:assert/strict";
import { describeSync } from "../lib/sync-report.ts";

const answer = (status: number, body: object | null, raw = "") => ({ kind: "answer" as const, status, body, raw });

test("a dead network is not blamed on the token", () => {
  const out = describeSync({ kind: "network" });
  assert.equal(out.tone, "error");
  assert.doesNotMatch(out.text, /token/i);
});

test("an expired session says so", () => {
  assert.match(describeSync(answer(401, null)).text, /sign-in has expired/);
});

test("a gateway timeout page is unknown, not a refusal", () => {
  const out = describeSync(answer(504, null, "<html>Gateway Timeout</html>"));
  assert.match(out.text, /didn't answer properly/);
  assert.match(out.detail ?? "", /HTTP 504/);
});

test("the refresh grant's own reason wins over the fallback's error", () => {
  const out = describeSync(
    answer(502, {
      ok: false,
      error: "LHV GET /accounts failed: HTTP 401",
      refreshGrant: "LHV token refresh failed: HTTP 400 — invalid_grant",
    })
  );
  assert.match(out.text, /no longer accepts the stored token/);
});

test("other LHV errors say nothing came in and that the hourly sync retries", () => {
  assert.match(describeSync(answer(502, { ok: false, error: "LHV GET /statement failed: HTTP 503" })).text, /hourly sync tries again/);
});

test("success counts rows and accounts; nothing new reads as up to date", () => {
  assert.equal(describeSync(answer(200, { ok: true, mapped: 14, accounts: 2 })).text, "Fetched 14 transactions from 2 accounts.");
  assert.equal(describeSync(answer(200, { ok: true, mapped: 1, accounts: 1 })).text, "Fetched 1 transaction from 1 account.");
  assert.match(describeSync(answer(200, { ok: true, mapped: 0, accounts: 2 })).text, /Up to date/);
});

test("a sync that only worked through the access-token fallback warns", () => {
  const out = describeSync(answer(200, { ok: true, mapped: 3, accounts: 1, refreshGrant: "HTTP 400 — invalid_grant" }));
  assert.equal(out.tone, "warn");
  assert.match(out.text, /access token/);
});

test("the troubleshooting hint the refresh error carries does not decide the diagnosis", () => {
  const grant =
    'LHV token refresh failed: HTTP 400 — {"error":"invalid_grant"}. invalid_client → LHV\'s client id changed, set LHV_CLIENT_ID; invalid_grant → paste a fresh refresh token from api.lhv.ai/api-access.';
  assert.match(describeSync(answer(502, { ok: false, error: "x", refreshGrant: grant })).text, /no longer accepts the stored token/);
});
