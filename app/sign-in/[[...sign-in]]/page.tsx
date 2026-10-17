import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { authEnabled } from "@/lib/auth";
import { SignInFrame } from "@/components/sign-in-frame";

export const metadata: Metadata = { title: "Sign in · Kopikas" };

// Sign-in inside the app's own frame: the coin, the wordmark and the tagline over
// Clerk's card, which wears the board's look (ClerkThemed).
export default function SignInPage() {
  return <SignInFrame>{authEnabled ? <SignIn /> : null}</SignInFrame>;
}
