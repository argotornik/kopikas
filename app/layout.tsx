import type { Metadata } from "next";
import "./globals.css";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { authEnabled } from "@/lib/auth";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-var" });
// Display face: wordmark and card titles only — body and amounts stay Geist.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading-var" });

export const metadata: Metadata = {
  title: "Kopikas",
  description: "Iga kopikas loeb — personal money board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable, geistMono.variable, bricolage.variable)}
    >
      <body>{authEnabled ? <ClerkProvider>{content}</ClerkProvider> : content}</body>
    </html>
  );
}
