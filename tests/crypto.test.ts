import { test } from "node:test";
import assert from "node:assert/strict";
import { sameSecret, seal, unseal } from "../lib/crypto.ts";

const withKey = (value: string, run: () => void) => {
  const before = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = value;
  try {
    run();
  } finally {
    if (before === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = before;
  }
};

test("a 32-byte base64 key seals and unseals, and is used as the key itself", () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  withKey(key, () => {
    const sealed = seal("refresh-token");
    assert.equal(unseal(sealed), "refresh-token");
    assert.notEqual(JSON.parse(sealed).data, "refresh-token");
  });
});

test("a passphrase seals and unseals too, and a different passphrase cannot open it", () => {
  let sealed = "";
  withKey("correct horse battery staple", () => {
    sealed = seal("refresh-token");
    assert.equal(unseal(sealed), "refresh-token");
  });
  withKey("correct horse battery stable", () => {
    assert.throws(() => unseal(sealed));
  });
});

test("a short secret is refused", () => {
  withKey("too-short", () => {
    assert.throws(() => seal("x"), /at least 16 characters/);
  });
});

test("sameSecret matches only the exact secret, whatever the lengths", () => {
  assert.equal(sameSecret("Bearer abc123", "Bearer abc123"), true);
  assert.equal(sameSecret("Bearer abc124", "Bearer abc123"), false);
  assert.equal(sameSecret("Bearer abc", "Bearer abc123"), false);
  assert.equal(sameSecret("", "Bearer abc123"), false);
});
