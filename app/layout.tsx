import type { Metadata } from "next";
import "./globals.css";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { authEnabled } from "@/lib/auth";
import { ClerkThemed } from "@/components/clerk-themed";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-var" });
// Display face: wordmark and card titles only — body and amounts stay Geist.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading-var" });

export const metadata: Metadata = {
  title: "Kopikas",
  description: "Iga kopikas loeb — personal money board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ThemeProvider outside so Clerk's components can follow the resolved theme.
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {authEnabled ? <ClerkThemed>{children}</ClerkThemed> : children}
    </ThemeProvider>
  );
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable, geistMono.variable, bricolage.variable)}
    >
      <body>{content}</body>
    </html>
  );
}
