import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { getAccounts, getLhvTokens, readDb } from "@/lib/storage";
import { FirstRun } from "@/components/first-run";
import { buildBoard } from "@/lib/board";
import { currentEmail, currentRole, ownerConfigured } from "@/lib/auth";
import { NotOnBoard, SetupOwner } from "@/components/setup-owner";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; month?: string; q?: string }>;
}) {
  const role = await currentRole();
  if (role === "partner") redirect("/pooleks");
  if (role !== "owner") {
    // Signed in, but not the owner. On a deployment with no owner configured
    // that is the owner-to-be looking at their own fresh install.
    const email = await currentEmail();
    if (!ownerConfigured && email) return <SetupOwner email={email} />;
    return <NotOnBoard email={email} />;
  }
  const [db, { accounts }, view, tokens] = await Promise.all([readDb(), getAccounts(), searchParams, getLhvTokens()]);
  // Nothing synced yet: a fresh deployment, with or without a stored token. Walk them in.
  if (db.transactions.length === 0) return <FirstRun hasToken={!!tokens} />;
  return <Board initial={buildBoard(db, new Date(), accounts)} view={view} />;
}
