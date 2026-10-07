import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoinMark } from "@/components/coin-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

// The one header every page wears: the coin and the page's name, a line
// under it when the page has something to say (the board's sync time), the
// page's own links, and always the theme toggle and the account button, so
// signing out is possible from every screen. `heading` makes the name the
// page's h1; pages with a title of their own (first run) keep it a wordmark.
export function PageHeader({
  title = "Kopikas",
  heading = false,
  sub,
  className,
  children,
}: {
  title?: string;
  heading?: boolean;
  sub?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const Title = heading ? "h1" : "div";
  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col">
        <Title className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
          <CoinMark />
          {title}
        </Title>
        {sub}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {children}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

// A link between pages in the header. The arrow is drawn, not typed: the
// arrow characters are not in Geist and would fall back to another face.
export function HeaderLink({ href, back = false, children }: { href: string; back?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:px-2"
    >
      {back && <ArrowLeftIcon aria-hidden className="size-3.5" />}
      {children}
      {!back && <ArrowRightIcon aria-hidden className="size-3.5" />}
    </a>
  );
}
