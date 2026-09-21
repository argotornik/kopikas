import { CoinMark } from "@/components/coin-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

// The wordmark and the account controls, for pages that are not the board:
// first run, owner setup, the locked door. Signing out has to be possible
// from every one of them.
export function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
        <CoinMark />
        Kopikas
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  );
}
