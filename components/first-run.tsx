import { ConnectForm } from "@/components/connect-form";
import { PageHeader } from "@/components/page-header";

// An empty board is a fresh deployment, not a quiet month: say what to do
// next, and make the doing one action. With a token already stored the
// same page offers to run the sync again or take a fresh token.
export function FirstRun({ hasToken }: { hasToken: boolean }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6">
      <PageHeader />
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Connect your LHV account</h1>
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
        <li>Copy the refresh token it shows you and paste it below.</li>
      </ol>
      <ConnectForm hasToken={hasToken} />
      <p className="text-xs text-muted-foreground">
        The token is stored encrypted and never shown again. It renews itself on every sync and only expires
        after 30 days without one.
      </p>
    </div>
  );
}
