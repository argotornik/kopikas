import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { authEnabled } from "@/lib/auth";
import { ClerkThemed } from "@/components/clerk-themed";
import { Toaster } from "@/components/toaster";
// Rubik and Fredoka for everything, notices and Clerk's card included.
import { coinFontVariables } from "@/components/coin-fonts";

export const metadata: Metadata = {
  title: "Kopikas",
  description: "Iga kopikas loeb — personal money board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ThemeProvider outside so Clerk's components can follow the resolved theme.
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {authEnabled ? <ClerkThemed>{children}</ClerkThemed> : children}
      <Toaster />
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
