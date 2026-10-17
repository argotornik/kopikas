"use client";

import { HouseIcon, UsersIcon } from "lucide-react";
import { CoinHeader } from "@/components/coin-header";
import { DISPLAY, FOCUS, MUTED, PAGE } from "@/components/coin-look";
import { SettingsForm } from "@/components/settings-form";
import { RulesList, type RuleRow } from "@/components/rules-list";
import { ShareRulesList, type ShareRuleRow } from "@/components/share-rules-list";
import { cn } from "@/lib/utils";

// Settings in the new look: the bank connection, then what the board has been taught,
// a card per category, then what goes on Pooleks by itself.
export function SettingsView({
  fontClass,
  connection,
  rules,
  categories,
  shareRules,
}: {
  fontClass: string;
  connection: React.ComponentProps<typeof SettingsForm>;
  rules: RuleRow[];
  categories: string[];
  shareRules: ShareRuleRow[];
}) {
  return (
    <div className={cn(fontClass, PAGE)}>
      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
        <CoinHeader
          links={[
            { href: "/", label: "Board", icon: HouseIcon },
            { href: "/pooleks", label: "Pooleks", icon: UsersIcon },
          ]}
        />
        {/* The theme's variables re-tinted, so the fields and buttons shared with
            the first run wear the new look here. */}
        <main className="coins-panel flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className={cn(DISPLAY, "text-[34px] font-semibold leading-tight sm:text-[40px]")}>Settings</h1>
            {/* The rule lists can run long; the Pooleks rules should not be a guess at the bottom. */}
            <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
              {(
                [
                  ["#connection", "Connection", null],
                  ["#filing-rules", "Filing rules", rules.length],
                  ["#pooleks-rules", "Pooleks rules", shareRules.length],
                ] as const
              ).map(([href, label, n]) => (
                <a
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F4F5F7] px-3.5 text-[13px] font-medium hover:bg-[#E9EBEF] pointer-coarse:h-11 dark:bg-[#191B22] dark:hover:bg-[#23252E]",
                    FOCUS
                  )}
                >
                  {label}
                  {n !== null && <span className={cn("font-normal tabular-nums", MUTED)}>{n}</span>}
                </a>
              ))}
            </nav>
          </div>
          <SettingsForm {...connection} />
          <RulesList initial={rules} categories={categories} />
          <ShareRulesList initial={shareRules} />
        </main>
      </div>
    </div>
  );
}
