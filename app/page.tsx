import Board from "@/components/Board";
import { readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDb();
  return <Board initial={buildBoard(db)} />;
}
