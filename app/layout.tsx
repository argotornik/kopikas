import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { authEnabled } from "@/lib/auth";
import { ClerkThemed } from "@/components/clerk-themed";
import { Toaster } from "@/components/toaster";
import { Blinker } from "@/components/blinker";
import { DemoMount } from "@/components/demo-mount";
import { DEMO } from "@/lib/demo-flag";
// Rubik and Fredoka for everything, notices and Clerk's card included.
import { coinFontVariables } from "@/components/coin-fonts";

// A household's private board: every page, sign-in and the wrong-address page included, asks
// search engines not to list it or follow its links. Crawling stays allowed (app/robots.ts), so
// they can read this; a page they may not crawl can still be listed from a link elsewhere.
// The demo is there to be shared: its link opens as a card (LinkedIn, Slack and the like), with the
// picture drawn in the Figma kit (Decisions, "Demo tips", "LinkedIn preview v2"). The address is the one
// Vercel gives the demo's project. LinkedIn keeps a picture by its address, so ?v goes up with each new one.
const DEMO_TITLE = "Kopikas · try the demo";
const DEMO_LINE = "A money board where every charge is a coin. Drop a few in their rolls with a made-up household. No sign-up.";
const DEMO_PICTURE = { url: "/demo-preview.png?v=2", width: 1200, height: 630, alt: "Kopikas: painted rolls for Groceries, Eating out, Home and Pets, with a coin dropping into Eating out" };
export const metadata: Metadata = DEMO
  ? {
      metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3002"),
      title: DEMO_TITLE,
      description: DEMO_LINE,
      robots: { index: false, follow: false },
      openGraph: { type: "website", siteName: "Kopikas", title: DEMO_TITLE, description: DEMO_LINE, images: [DEMO_PICTURE] },
      twitter: { card: "summary_large_image", title: DEMO_TITLE, description: DEMO_LINE, images: [DEMO_PICTURE] },
    }
  : {
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
      {/* The demo's bar, tips and end card: on the demo's deployment only. */}
      <DemoMount />
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
