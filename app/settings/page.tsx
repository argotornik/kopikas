import { redirect } from "next/navigation";
import { pageRole } from "@/lib/auth";
import { getAccounts, getLhvTokens, readDb } from "@/lib/storage";
import { matches } from "@/lib/engine";
import { SettingsView } from "@/components/settings-view";
import { coinFonts } from "@/components/coin-fonts";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const role = await pageRole();
  if (role !== "owner") redirect("/");

  // Only metadata crosses to the client — never the token itself.
  const [tokens, { accounts, fetchedAt }, db] = await Promise.all([getLhvTokens(), getAccounts(), readDb()]);
  const rules = [...db.rules]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({
      id: r.id,
      match: r.match,
      category: r.category,
      createdAt: r.createdAt,
      matches: db.transactions.filter((t) => matches(t, r.match)).length,
    }));

  const shareRules = [...db.shareRules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <SettingsView
      fontClass={coinFonts}
      connection={{
        tokenUpdatedAt: tokens?.updatedAt ?? null,
        accountCount: accounts.length,
        accountsFetchedAt: fetchedAt,
        encrypted: !!process.env.DATABASE_URL,
      }}
      rules={rules}
      categories={db.categories.map((c) => c.name)}
      shareRules={shareRules}
    />
  );
}
