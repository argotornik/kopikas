import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM sealing for the LHV token row. ENCRYPTION_KEY lives only in
// Vercel env — the reason tokens sit encrypted in Postgres instead of in env
// vars is that refresh tokens may rotate on use, and env is read-only at
// runtime. Any secret of 16+ characters works: a value that is exactly 32
// bytes of base64 (the openssl rand -base64 32 form) is the key itself, so
// rows sealed before passphrases were accepted still open; anything else, a
// passphrase from a password manager, is hashed to 32 bytes.

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const decoded = /^[A-Za-z0-9+/]+={0,2}$/.test(raw) ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (decoded.length === 32) return decoded;
  if (raw.length < 16) throw new Error("ENCRYPTION_KEY must be at least 16 characters");
  return createHash("sha256").update(raw, "utf8").digest();
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  });
}

export function unseal(sealed: string): string {
  const { iv, tag, data } = JSON.parse(sealed) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
