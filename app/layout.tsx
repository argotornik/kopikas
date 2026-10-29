import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { authEnabled } from "@/lib/auth";
import { ClerkThemed } from "@/components/clerk-themed";
import { Toaster } from "@/components/toaster";
import { Blinker } from "@/components/blinker";
// Rubik and Fredoka for everything, notices and Clerk's card included.
import { coinFontVariables } from "@/components/coin-fonts";

// A household's private board: every page, sign-in and the wrong-address page included, asks
// search engines not to list it or follow its links. Crawling stays allowed (app/robots.ts), so
// they can read this; a page they may not crawl can still be listed from a link elsewhere.
export const metadata: Metadata = {
  title: "Kopikas",
  description: "Iga kopikas loeb — personal money board",
  robots: { index: false, follow: false },
};

// The browser's bar takes the page's own ground: Page White, or Night in dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1015" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ThemeProvider outside so Clerk's components can follow the resolved theme.
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {authEnabled ? <ClerkThemed>{children}</ClerkThemed> : children}
      <Toaster />
      <Blinker />
    </ThemeProvider>
  );
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", coinFontVariables)}
    >
      <body>{content}</body>
    </html>
  );
}
