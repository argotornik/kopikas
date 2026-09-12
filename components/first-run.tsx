import { CoinMark } from "@/components/coin-mark";
import { SettingsForm } from "@/components/settings-form";

// An empty production board is a fresh deployment, not a quiet month: say
// what to do next, and put the token field right here.
export function FirstRun() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-10">
      <div className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
        <CoinMark />
        Kopikas
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Connect your LHV account</h1>
      <p className="text-sm text-muted-foreground">
        Nothing here yet. The board fills from your bank statement once LHV is connected, and from then on a
        sync runs every hour by itself.
      </p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          Open{" "}
          <a href="https://api.lhv.ai/api-access" className="underline" target="_blank" rel="noreferrer">
            api.lhv.ai/api-access
          </a>{" "}
          and sign in with Smart-ID, Mobile-ID or ID-card. Grant the two read-only scopes, accounts and transactions.
        </li>
        <li>Copy the refresh token it shows you.</li>
        <li>Paste it below, save, then run the first sync. When it reports fetched rows, reload this page.</li>
      </ol>
      <SettingsForm tokenUpdatedAt={null} accountCount={0} accountsFetchedAt={null} />
    </div>
  );
}
