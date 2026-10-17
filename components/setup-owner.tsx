"use client";

import { CoinHeader } from "@/components/coin-header";
import { PaintedCoin } from "@/components/painted";
import { StepNumber } from "@/components/first-run";
import { CARD, DISPLAY, INK_TEXT, MUTED, OAT, PAGE, PANEL } from "@/components/coin-look";
import { OWNER_NAME } from "@/lib/names";
import { cn } from "@/lib/utils";

// Signed in on a deployment that has no owner yet: the person looking at this is
// almost certainly the owner, so tell them exactly what to set.
export function SetupOwner({ email, fontClass }: { email: string; fontClass: string }) {
  return (
    <Frame fontClass={fontClass}>
      <main className={cn(PANEL, OAT, "p-5 sm:p-8")}>
        <div className="max-w-[640px]">
          <p className={cn("text-[15px]", MUTED)}>Before the board opens</p>
          <h1 className={cn(DISPLAY, "mt-1 text-[30px] font-semibold leading-tight sm:text-[40px]")}>Who owns this board?</h1>
          <p className={cn("mt-2 text-[15px]", MUTED)}>
            You are signed in as <span className={cn("font-medium", INK_TEXT)}>{email}</span>, and this deployment has not
            been told who its owner is yet. Three steps, once.
          </p>
          <ol className="mt-4 flex flex-col gap-2.5 text-[15px]">
            <li className="flex items-start gap-3">
              <StepNumber n={1} />
              <span>
                In Vercel, open the project, then Settings and Environment Variables. Add <Var>OWNER_EMAIL</Var> with the
                value <Var>{email}</Var>. If you share the board with someone, add <Var>PARTNER_EMAIL</Var> with their
                sign-in address too. <Var>NEXT_PUBLIC_OWNER_NAME</Var> and <Var>NEXT_PUBLIC_PARTNER_NAME</Var> set how the
                two of you are named on screen.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <StepNumber n={2} />
              <span>Redeploy from the Deployments tab so the new variables take effect.</span>
            </li>
            <li className="flex items-start gap-3">
              <StepNumber n={3} />
              <span>Reload this page. The next screen connects your LHV account.</span>
            </li>
          </ol>
        </div>
      </main>
    </Frame>
  );
}

// Signed in, owner configured, and not one of the two: a locked door, with the
// signed-in address so a typo in the variables is visible to the owner.
export function NotOnBoard({ email, fontClass }: { email: string | null; fontClass: string }) {
  return (
    <Frame fontClass={fontClass}>
      <main className={cn(PANEL, OAT, "flex flex-col items-center px-6 py-12 text-center")}>
        <PaintedCoin size={64} seed={4} />
        <h1 className={cn(DISPLAY, "mt-4 text-[24px] font-semibold")}>Not on this board</h1>
        <p className={cn("mt-1 max-w-[46ch] text-[15px]", MUTED)}>
          This account isn&apos;t one of the two on this board. Ask {OWNER_NAME === "Owner" ? "whoever set it up" : OWNER_NAME} to
          add it.
        </p>
        {email && (
          <p className={cn("mt-3 max-w-[52ch] text-[13px]", MUTED)}>
            Signed in as {email}. Your own deployment? Then <Var>OWNER_EMAIL</Var> does not match this address.
          </p>
        )}
      </main>
    </Frame>
  );
}

// The page around both: the new look's header, which keeps the account button for signing out.
function Frame({ fontClass, children }: { fontClass: string; children: React.ReactNode }) {
  return (
    <div className={cn(fontClass, PAGE)}>
      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <CoinHeader links={[]} />
        {children}
      </div>
    </div>
  );
}

// A variable's name, as it is typed.
function Var({ children }: { children: React.ReactNode }) {
  return (
    <code className={cn("rounded-md px-1.5 py-0.5 text-[13px] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]", CARD, INK_TEXT)}>
      {children}
    </code>
  );
}
