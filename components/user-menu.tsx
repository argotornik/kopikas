"use client";

import { UserButton } from "@clerk/nextjs";

// Renders the Clerk account button only when Clerk is active — the publishable
// key is the client-visible half of the same "keys present?" switch.
export function UserMenu() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return <UserButton />;
}
