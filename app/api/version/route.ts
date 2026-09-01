import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public and values-free: which build is live. Lets the dev loop confirm a
// deploy landed (compare against `git log`) without any Vercel credentials.
// VERCEL_GIT_* are injected by Vercel at build time.
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  });
}
