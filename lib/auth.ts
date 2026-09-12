import { currentUser } from "@clerk/nextjs/server";

// Auth mirrors the storage pattern: enabled exactly where the secrets live.
// No CLERK_SECRET_KEY (local dev) -> auth off, everything acts as the owner.
// Keys present (Vercel) -> Clerk enforces sign-in and these roles apply:
//   OWNER_EMAIL    -> "owner"    (everything)
//   PARTNER_EMAIL  -> "partner"  (Pooleks: add what they paid, settle up)
//   anyone else -> null    (signed in but not one of the two -> 403)

export type Role = "owner" | "partner" | null;

export const authEnabled = !!process.env.CLERK_SECRET_KEY;

export async function currentRole(): Promise<Role> {
  if (!authEnabled) return "owner";
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return null;
  if (email === process.env.OWNER_EMAIL?.toLowerCase()) return "owner";
  if (email === process.env.PARTNER_EMAIL?.toLowerCase()) return "partner";
  return null;
}
