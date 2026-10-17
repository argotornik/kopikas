"use client"; // Error boundaries must be Client Components

import "./globals.css";
import { useEffect } from "react";
import { ErrorView } from "@/components/error-view";
import { coinFontVariables } from "@/components/coin-fonts";
import { cn } from "@/lib/utils";

// The root layout itself failed (Clerk's provider, the theme), so this replaces the whole
// document: its own html and body, the app's styles and faces, and the error page without
// the header, whose account button needs the provider that just failed. The theme
// provider is gone too, so it shows in the light theme.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className={cn("font-sans", coinFontVariables)}>
      <body>
        <ErrorView digest={error.digest} retry={retry} header={false} />
      </body>
    </html>
  );
}
