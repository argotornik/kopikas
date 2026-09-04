"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

// Clerk's components wearing Kopikas: copper primary, the app's radius and
// font, dark base theme following next-themes. Sign-up is invite-only, so
// the "Don't have an account?" footer has nothing to point at and is hidden.
export function ClerkThemed({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      appearance={{
        theme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#b06e3e", // Kopikas copper — matches --primary
          borderRadius: "0.625rem",
          fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
        },
        elements: {
          footerAction: "hidden",
          cardBox: "shadow-none ring-1 ring-foreground/10",
        },
      }}
      localization={{
        signIn: {
          start: {
            title: "Sign in to Kopikas",
            subtitle: "Every kopikas counts — welcome back.",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
