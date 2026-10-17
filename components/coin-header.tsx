import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PaintedCoin } from "@/components/painted";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { DISPLAY, FOCUS } from "@/components/coin-stage";
import { cn } from "@/lib/utils";

// The header of every page in the new look: the coin and the wordmark, a line under it
// when the page has one to say, the other pages (icons on a phone), the theme, and the
// account button, so signing out works from every screen.
export function CoinHeader({
  links,
  sub,
  heading = false,
}: {
  links: { href: string; label: string; icon: LucideIcon }[];
  sub?: ReactNode;
  // The wordmark is the page's heading on the board; other pages name themselves.
  heading?: boolean;
}) {
  const Wordmark = heading ? "h1" : "p";
  return (
    <header className="flex items-center gap-x-6 gap-y-3 py-5">
      <div className="flex items-center gap-3">
        <PaintedCoin size={38} seed={3} />
        <div>
          <Wordmark className={cn(DISPLAY, "text-[26px] font-semibold leading-none tracking-[-0.01em]")}>Kopikas</Wordmark>
          {sub}
        </div>
      </div>
      <nav aria-label="Pages" className="ml-auto flex items-center gap-1.5 text-[15px] font-medium">
        {links.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            aria-label={label}
            className={cn("rounded-full p-2.5 hover:bg-[#F4F5F7] sm:px-3.5 sm:py-2 dark:hover:bg-[#191B22]", FOCUS)}
          >
            <Icon aria-hidden className="size-5 sm:hidden" />
            <span className="hidden sm:inline">{label}</span>
          </a>
        ))}
        <ThemeToggle />
        <UserMenu />
      </nav>
    </header>
  );
}
