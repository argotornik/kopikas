import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { authEnabled } from "@/lib/auth";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-var" });

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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, geistMono.variable)}>
      <body>{authEnabled ? <ClerkProvider>{content}</ClerkProvider> : content}</body>
    </html>
  );
}
