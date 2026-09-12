import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { authEnabled } from "@/lib/auth";
import { CoinMark } from "@/components/coin-mark";

export const metadata: Metadata = { title: "Sign in · Kopikas" };

// Sign-in inside the app's own frame — coin, wordmark, tagline — instead of
// Clerk's hosted portal. The Clerk card itself is themed in ClerkThemed.
export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
          <CoinMark />
          Kopikas
        </div>
        <p className="text-sm italic text-muted-foreground">iga kopikas loeb</p>
      </div>
      {authEnabled ? (
        <SignIn />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Sign-in is off in local development — the board acts as the owner.
        </p>
      )}
    </div>
  );
}
