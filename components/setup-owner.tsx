import { PageHeader } from "@/components/page-header";
import { OWNER_NAME } from "@/lib/names";

// Signed in on a deployment that has no owner yet: the person looking at
// this is almost certainly the owner, so tell them exactly what to set.
export function SetupOwner({ email }: { email: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6">
      <PageHeader />
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Who owns this board?</h1>
      <p className="text-sm text-muted-foreground">
        You are signed in as <span className="font-medium text-foreground">{email}</span>, and this deployment has
        not been told who its owner is yet. Three steps, once.
      </p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          In Vercel, open the project, then Settings and Environment Variables. Add <Var>OWNER_EMAIL</Var> with the
          value <Var>{email}</Var>. If you share the board with someone, add <Var>PARTNER_EMAIL</Var> with their
          sign-in address too. <Var>NEXT_PUBLIC_OWNER_NAME</Var> and <Var>NEXT_PUBLIC_PARTNER_NAME</Var> set how the
          two of you are named on screen.
        </li>
        <li>Redeploy from the Deployments tab so the new variables take effect.</li>
        <li>Reload this page. The next screen connects your LHV account.</li>
      </ol>
    </div>
  );
}

// Signed in, owner configured, and not one of the two: a locked door, with
// the signed-in address so a typo in the variables is visible to the owner.
export function NotOnBoard({ email }: { email: string | null }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6">
      <PageHeader />
      <div className="flex flex-col gap-2 py-10 text-center text-sm text-muted-foreground">
        <p>This account isn&apos;t on the board. Ask {OWNER_NAME}.</p>
        {email && (
          <p className="text-xs">
            Signed in as {email}. Your own deployment? Then <Var>OWNER_EMAIL</Var> does not match this address.
          </p>
        )}
      </div>
    </div>
  );
}

function Var({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>;
}
