"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { FOCUS } from "@/components/coin-look";

// Clerk's components in the board's look: an Oat Paper card with generous corners, white
// fields, Ink for the action, Rubik and Fredoka, following the theme. Sign-up is
// invite-only, so the "Don't have an account?" footer has nothing to point at and is hidden.
const LIGHT = {
  colorPrimary: "#16171C",
  colorPrimaryForeground: "#FFFFFF",
  colorBackground: "#EFEBE3",
  colorForeground: "#16171C",
  colorMutedForeground: "#63666F",
  colorInput: "#FFFFFF",
  colorInputForeground: "#16171C",
  colorNeutral: "#16171C",
};
const DARK = {
  colorPrimary: "#F3F2EE",
  colorPrimaryForeground: "#16171C",
  colorBackground: "#1F1D22",
  colorForeground: "#F3F2EE",
  colorMutedForeground: "#A7A9B4",
  colorInput: "#23252E",
  colorInputForeground: "#F3F2EE",
  colorNeutral: "#F3F2EE",
};

export function ClerkThemed({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      appearance={{
        // Clerk's styles go in their own layer, under Tailwind's utilities (order in
        // globals.css), so the classes in `elements` win over Clerk's defaults.
        cssLayerName: "clerk",
        theme: isDark ? dark : undefined,
        variables: {
          ...(isDark ? DARK : LIGHT),
          borderRadius: "1rem",
          fontFamily: "var(--font-coins-body), ui-sans-serif, system-ui, sans-serif",
        },
        elements: {
          footerAction: "hidden",
          cardBox: "shadow-none rounded-[28px]",
          // "Secured by Clerk" sits in the same Oat Paper, so the card is one piece: the
          // inner card's bottom corners stay square, or the page shows where they curve.
          card: "shadow-none rounded-b-none",
          footer: "bg-none bg-oat dark:bg-oat-night",
          headerTitle: "coins-display text-[20px] font-semibold",
          // Flat Ink, without Clerk's gloss (a gradient on ::after).
          formButtonPrimary: "rounded-full h-11 text-[15px] shadow-none after:hidden",
          socialButtonsBlockButton: "rounded-full h-11",
          // The token field's look: a white pill with its own edge, darker in focus, the
          // board's outline for the keyboard. Clerk's rings are box-shadows, its error
          // ring among them, so an error colours the edge instead.
          formFieldInput: `rounded-full h-11 shadow-none border-2 border-ink/15 focus:border-ink/35 aria-invalid:border-destructive dark:border-white/15 dark:focus:border-white/35 dark:aria-invalid:border-destructive ${FOCUS}`,
        },
      }}
      localization={{
        signIn: {
          // Clerk shows its combined sign-in-or-up screen, which reads the *Combined keys.
          start: {
            title: "Sign in to Kopikas",
            titleCombined: "Sign in to Kopikas",
            // The page already carries the tagline; this line says which address works.
            subtitle: "Use the address this board was set up for.",
            subtitleCombined: "Use the address this board was set up for.",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
