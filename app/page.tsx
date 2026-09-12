import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { getAccounts, getLhvTokens, readDb } from "@/lib/storage";
import { FirstRun } from "@/components/first-run";
import { OWNER_NAME } from "@/lib/names";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; month?: string; q?: string }>;
}) {
  const role = await currentRole();
  if (role === "partner") redirect("/pooleks");
  if (role !== "owner") {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-muted-foreground">
        This account isn&apos;t on the board. Ask {OWNER_NAME}.
      </div>
    );
  }
  const [db, { accounts }, view, tokens] = await Promise.all([readDb(), getAccounts(), searchParams, getLhvTokens()]);
  // No bank connected and nothing synced: a fresh deployment. Walk them in.
  if (!tokens && db.transactions.length === 0) return <FirstRun />;
  return <Board initial={buildBoard(db, new Date(), accounts)} view={view} />;
}
