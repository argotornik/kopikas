import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { getAccounts, getLhvTokens } from "@/lib/storage";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const role = await currentRole();
  if (role !== "argo") redirect("/");

  // Only metadata crosses to the client — never the token itself.
  const [tokens, { accounts, fetchedAt }] = await Promise.all([getLhvTokens(), getAccounts()]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← board
        </a>
      </div>
      <SettingsForm
        tokenUpdatedAt={tokens?.updatedAt ?? null}
        accountCount={accounts.length}
        accountsFetchedAt={fetchedAt}
      />
    </div>
  );
}
