import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { getAccounts, readDb } from "@/lib/storage";
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
  if (role !== "argo") {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-muted-foreground">
        This account isn&apos;t on the board. Ask Argo.
      </div>
    );
  }
  const [db, { accounts }, view] = await Promise.all([readDb(), getAccounts(), searchParams]);
  return <Board initial={buildBoard(db, new Date(), accounts)} view={view} />;
}
