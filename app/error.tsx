"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorView } from "@/components/error-view";

// A page that throws while opening (the database, Clerk, a bug) lands here instead of
// Next's bare error screen. A failure in the root layout itself goes to global-error.tsx.
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorView digest={error.digest} retry={retry} />;
}
