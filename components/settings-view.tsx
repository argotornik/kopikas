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
      <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6 wide:max-w-[2280px] ultra:max-w-[2664px]">
        <CoinHeader
          links={[
            { href: "/", label: "Board", icon: HouseIcon },
            { href: "/pooleks", label: "Pooleks", icon: UsersIcon },
          ]}
        />
        {/* The theme's variables re-tinted, so the fields and buttons shared with
            the first run wear the new look here. */}
        {/* From 1900px, two columns: the title, the connection and the Pooleks rules on the
            left, the filing rules (the long part) on the right, beside them from the top. On an
            ultrawide the page takes the board's width and the filing rules a fourth column. */}
        <main className="coins-panel flex flex-col gap-6 wide:grid wide:grid-cols-[720px_minmax(0,1fr)] wide:grid-rows-[auto_auto_1fr] wide:items-start wide:gap-x-8 wide:[&>#filing-rules]:col-start-2 wide:[&>#filing-rules]:row-span-3 wide:[&>#filing-rules]:row-start-1">
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
                    "inline-flex h-9 items-center gap-1.5 rounded-full bg-mist px-3.5 text-[13px] font-medium hover:bg-mist-hover pointer-coarse:h-11 dark:bg-mist-night dark:hover:bg-card-night",
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
