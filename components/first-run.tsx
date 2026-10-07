import { ConnectForm } from "@/components/connect-form";
import { PageHeader } from "@/components/page-header";

// An empty board is a fresh deployment, not a quiet month: say what to do
// next, and make the doing one action. With a token already stored the
// same page offers to run the sync again or take a fresh token.
export function FirstRun({ hasToken, encrypted }: { hasToken: boolean; encrypted: boolean }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6">
      <PageHeader />
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">Connect your LHV account</h1>
      <p className="text-sm text-muted-foreground">
        Nothing here yet. The board fills from your bank statement once LHV is connected, and from then on a
        sync runs every hour by itself.
      </p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          Open{" "}
          <a href="https://api.lhv.ai/api-access" className="underline" target="_blank" rel="noreferrer">
            api.lhv.ai/api-access
            <span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          and sign in with Smart-ID, Mobile-ID or ID-card. Grant the two read-only scopes, accounts and transactions.
        </li>
        <li>
          Copy the refresh token it shows and paste it below. It is the long one that renews itself, not the
          access token that lasts 15 minutes.
        </li>
      </ol>
      {/* What handing it over means, said before the button rather than after it. */}
      <p className="text-sm text-muted-foreground">
        Read-only: Kopikas sees balances and transactions and cannot make payments. The token renews itself with
        every sync and lapses only after 30 days without one
        {encrypted ? "; it is kept encrypted and never shown again." : "."}
      </p>
      <ConnectForm hasToken={hasToken} />
    </div>
  );
}
