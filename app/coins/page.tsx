import { redirect } from "next/navigation";
import { Fredoka, Rubik } from "next/font/google";
import { CoinBoard } from "@/components/coin-board";
import { getAccounts, readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";
import { PARTNER_NAME } from "@/lib/names";

// The new board, growing here until it takes over from the one at /. Real data,
// real filing. The sketch it grew from is at /coins/sketch.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-coins-display" });
const rubik = Rubik({ subsets: ["latin", "latin-ext"] });

export const dynamic = "force-dynamic";

export default async function CoinsPage({ searchParams }: { searchParams: Promise<{ cat?: string; month?: string; q?: string }> }) {
  if ((await currentRole()) !== "owner") redirect("/");
  const [db, { accounts, fetchedAt }, view] = await Promise.all([readDb(), getAccounts(), searchParams]);
  if (db.transactions.length === 0) redirect("/");
  return (
    <CoinBoard
      initial={buildBoard(db, new Date(), accounts)}
      syncedAt={fetchedAt}
      view={view}
      fontClass={`${rubik.className} ${fredoka.variable}`}
      // A household with a partner splits costs with them: one is configured, or something was split.
      partner={process.env.PARTNER_EMAIL || db.shares.length > 0 ? PARTNER_NAME : null}
    />
  );
}
