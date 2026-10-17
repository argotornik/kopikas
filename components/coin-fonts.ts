import { Fredoka, Rubik } from "next/font/google";

// The new look's faces: Fredoka for the voice, Rubik for everything that is read.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-coins-display" });
const rubik = Rubik({ subsets: ["latin", "latin-ext"] });

export const coinFonts = `${rubik.className} ${fredoka.variable}`;
