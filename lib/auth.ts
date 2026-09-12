import { currentUser } from "@clerk/nextjs/server";

// Auth mirrors the storage pattern: enabled exactly where the secrets live.
// No CLERK_SECRET_KEY (local dev) -> auth off, everything acts as Argo.
// Keys present (Vercel) -> Clerk enforces sign-in and these roles apply:
//   ARGO_EMAIL     -> "argo"     (everything)
//   PARTNER_EMAIL  -> "partner"  (Pooleks + quick-add only)
//   anyone else -> null    (signed in but not one of the two -> 403)

export type Role = "argo" | "partner" | null;

export const authEnabled = !!process.env.CLERK_SECRET_KEY;

export async function currentRole(): Promise<Role> {
  if (!authEnabled) return "argo";
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return null;
  if (email === process.env.ARGO_EMAIL?.toLowerCase()) return "argo";
  if (email === process.env.PARTNER_EMAIL?.toLowerCase()) return "partner";
  return null;
}
