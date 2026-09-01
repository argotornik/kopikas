import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM sealing for the LHV token row. ENCRYPTION_KEY is 32 bytes,
// base64 (openssl rand -base64 32), and lives only in Vercel env — the reason
// tokens sit encrypted in Postgres instead of in env vars is that refresh
// tokens may rotate on use, and env is read-only at runtime.

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes base64");
  return buf;
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
