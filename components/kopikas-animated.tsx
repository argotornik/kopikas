"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import { DotLottieReact, setWasmUrl, type DotLottie } from "@lottiefiles/dotlottie-react";
import { KopikasMascot } from "@/components/kopikas-mascot";
import type { PaintedPose } from "@/components/kopikas-painted";

// The player's renderer is served by Kopikas itself (copied into public/ on
// install), so no visitor's browser asks a public CDN for it.
setWasmUrl("/dotlottie-player.wasm");

// The animated set pieces: one .lottie, one animation per pose, named as in
// design/kopikas/README.md, with light and dark themes. Built by
// npm run kopikas:lottie from the same data as the code-drawn Kopikas.
const SRC = "/kopikas.lottie";
// The set pieces play from that file; idle moments stay code-drawn, so the
// eyes keep following the pointer. One-shots hold their last frame.
const SET_PIECES: PaintedPose[] = ["hello", "jump", "excited"];
const ONCE: PaintedPose[] = ["hello", "jump"];

// Whether the file exists, asked once per page load. Until it does, every
// moment is code-drawn and nothing else changes.
let available: Promise<boolean> | null = null;
const hasFile = () => (available ??= fetch(SRC, { method: "HEAD" }).then((r) => r.ok, () => false));

// Kopikas, choosing per moment between the Lottie file and the code-drawn
// figure. Reduced motion always gets the code-drawn one, standing still.
export function KopikasAnimated(props: ComponentProps<typeof KopikasMascot>) {
  const { look = "goofy", paintedPose = "friendly", size = 112 } = props;
  const reduce = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    hasFile().then((ok) => on && setReady(ok));
    return () => {
      on = false;
    };
  }, []);

  const drawn = <KopikasMascot {...props} />;
  if (!(ready && !reduce && look === "painted" && SET_PIECES.includes(paintedPose))) return drawn;
  return <SetPiece key={paintedPose} pose={paintedPose} size={size} theme={resolvedTheme === "dark" ? "dark" : "light"} underneath={drawn} />;
}

// One set piece from the file, in a player of its own. The code-drawn figure
// stays underneath until the player has painted its first frame, so Kopikas
// never blinks out while the file loads.
function SetPiece({ pose, size, theme, underneath }: { pose: PaintedPose; size: number; theme: "light" | "dark"; underneath: ReactNode }) {
  const [player, setPlayer] = useState<DotLottie | null>(null);
  const [painted, setPainted] = useState(false);
  const under = useRef<HTMLSpanElement>(null);
  const themeNow = useRef(theme);

  // Wired the moment the player is created, before its file has loaded, so
  // nothing is painted until the right animation and theme are in place.
  const wire = useCallback(
    (p: DotLottie | null) => {
      setPlayer(p);
      if (!p) return;
      // The drawn figure goes in the same frame the player first paints, so
      // the two never overlap.
      const shown = () => {
        if (under.current) under.current.style.visibility = "hidden";
        setPainted(true);
      };
      // This player version ignores animationId at start-up and loads the
      // file's first animation, so the right one is picked as the file loads.
      // The player paints its first frame straight after this, in the same task.
      p.addEventListener("load", () => {
        if (p.activeAnimationId !== pose) p.loadAnimation(pose);
        if (p.manifest?.themes?.some((t) => t.id === themeNow.current)) p.setTheme(themeNow.current);
        shown();
      });
    },
    [pose],
  );
  // Light or dark mode changing while the set piece plays.
  useEffect(() => {
    themeNow.current = theme;
    if (player?.isLoaded && player.manifest?.themes?.some((t) => t.id === theme)) player.setTheme(theme);
  }, [player, theme]);

  // The Lottie artboard carries a margin round the figure (148 by 156 units
  // against the figure's 124 by 150), so it sits offset by that margin.
  const unit = size / 124;
  return (
    <span className="relative block" style={{ width: size, height: 150 * unit }} aria-hidden>
      {!painted && (
        <span ref={under} className="absolute inset-0">
          {underneath}
        </span>
      )}
      <DotLottieReact
        src={SRC}
        animationId={pose}
        autoplay
        loop={!ONCE.includes(pose)}
        dotLottieRefCallback={wire}
        style={{ position: "absolute", left: -12 * unit, top: -6 * unit, width: 148 * unit, height: 156 * unit }}
      />
    </span>
  );
}
