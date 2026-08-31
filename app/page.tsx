import { redirect } from "next/navigation";
import Board from "@/components/Board";
import { readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const role = await currentRole();
  if (role === "anni") redirect("/anni");
  if (role !== "argo") {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-muted-foreground">
        This account isn&apos;t on the board. Ask Argo.
      </div>
    );
  }
  const db = await readDb();
  return <Board initial={buildBoard(db)} />;
}
