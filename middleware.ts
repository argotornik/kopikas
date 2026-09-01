import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// /api/sync stays outside Clerk: Vercel Cron can't sign in — it authenticates
// with the CRON_SECRET bearer check inside the route itself. /api/version is
// deliberately public: commit SHA only, so deploys can be verified externally.
const isPublic = createRouteMatcher(["/api/sync(.*)", "/api/version"]);

const handler = process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublic(req)) await auth.protect();
    })
  : () => NextResponse.next(); // keyless local dev: auth off

export default handler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
