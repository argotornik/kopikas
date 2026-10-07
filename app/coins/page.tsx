import { redirect } from "next/navigation";
import { Fredoka, Rubik } from "next/font/google";
import { CoinsPrototype } from "@/components/coins-prototype";
import { getAccounts, readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

// The coin tray in Family's register, tried on the first viewport only,
// beside the current board. Same data, nothing saved: a probe.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-coins-display" });
const rubik = Rubik({ subsets: ["latin", "latin-ext"] });

export const dynamic = "force-dynamic";

export default async function CoinsPage() {
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
