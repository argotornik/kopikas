import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk's session, nothing more: auth() and currentUser() only work on routes
// this runs on, so the matcher covers every page and API route. Who may see
// what is decided by each page and route (lib/auth.ts), never here.
const proxy = process.env.CLERK_SECRET_KEY
  ? // Signed-out visitors land on the in-app sign-in, not Clerk's portal.
    clerkMiddleware({ signInUrl: "/sign-in" })
  : () => NextResponse.next(); // keyless local dev: auth off

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
