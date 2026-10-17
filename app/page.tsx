import { redirect } from "next/navigation";
import { CoinBoard } from "@/components/coin-board";
import { coinFonts } from "@/components/coin-fonts";
import { getAccounts, getLhvTokens, readDb } from "@/lib/storage";
import { FirstRun } from "@/components/first-run";
import { buildBoard } from "@/lib/board";
import { currentEmail, ownerConfigured, pageRole } from "@/lib/auth";
import { PARTNER_NAME } from "@/lib/names";
import { NotOnBoard, SetupOwner } from "@/components/setup-owner";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; month?: string; q?: string }>;
}) {
  const role = await pageRole();
  if (role === "partner") redirect("/pooleks");
  if (role !== "owner") {
    // Signed in, but not the owner. On a deployment with no owner configured
    // that is the owner-to-be looking at their own fresh install.
    const email = await currentEmail();
    if (!ownerConfigured && email) return <SetupOwner email={email} fontClass={coinFonts} />;
    return <NotOnBoard email={email} fontClass={coinFonts} />;
  }
  const [db, { accounts, fetchedAt }, view, tokens] = await Promise.all([readDb(), getAccounts(), searchParams, getLhvTokens()]);
  // Nothing synced yet: a fresh deployment, with or without a stored token. Walk them in.
  if (db.transactions.length === 0)
    return (
      <FirstRun
        hasToken={!!tokens}
        encrypted={!!process.env.DATABASE_URL}
        categories={db.categories.map((c) => c.name)}
        fontClass={coinFonts}
      />
    );
  return (
    <CoinBoard
      initial={buildBoard(db, new Date(), accounts)}
      syncedAt={fetchedAt}
      view={view}
      fontClass={coinFonts}
      // A household with a partner splits costs with them: one is configured, or something was split.
      partner={process.env.PARTNER_EMAIL || db.shares.length > 0 ? PARTNER_NAME : null}
    />
  );
}
