import { redirect } from "next/navigation";
import { Fredoka, Rubik } from "next/font/google";
import { CoinsPrototype } from "@/components/coins-prototype";
import { getAccounts, readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

// The coin-tray sketch as it stood when /coins began growing into the real
// board (2026-10-16), kept to compare against, Goofy look and all. Same data,
// nothing saved. It shares the tray with /coins, so the tray's own changes show here too.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-coins-display" });
const rubik = Rubik({ subsets: ["latin", "latin-ext"] });

export const dynamic = "force-dynamic";

export default async function CoinsSketchPage() {
  if ((await currentRole()) !== "owner") redirect("/");
  const [db, { fetchedAt }] = await Promise.all([readDb(), getAccounts()]);
  if (db.transactions.length === 0) redirect("/");
  return (
    <CoinsPrototype
      initial={buildBoard(db, new Date())}
      syncedAt={fetchedAt}
      fontClass={`${rubik.className} ${fredoka.variable}`}
    />
  );
}
