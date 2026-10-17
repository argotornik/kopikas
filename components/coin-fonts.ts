import { Fredoka, Rubik } from "next/font/google";

// The app's faces: Fredoka for the voice, Rubik for everything that is read.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-coins-display" });
const rubik = Rubik({ subsets: ["latin", "latin-ext"], variable: "--font-coins-body" });

// Both faces as variables, for the root: what portals, notices and Clerk's card inherit.
export const coinFontVariables = `${rubik.variable} ${fredoka.variable}`;
// A page's own: Rubik set directly, Fredoka as a variable for the display class.
export const coinFonts = `${rubik.className} ${fredoka.variable}`;
