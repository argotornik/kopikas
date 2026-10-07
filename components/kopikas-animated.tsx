"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import { DotLottieReact, setWasmUrl, type DotLottie } from "@lottiefiles/dotlottie-react";
import { KopikasMascot } from "@/components/kopikas-mascot";
import type { PaintedPose } from "@/components/kopikas-painted";

// The player's renderer is served by Kopikas itself (copied into public/ on
// install), so no visitor's browser asks a public CDN for it.
setWasmUrl("/dotlottie-player.wasm");

// The hand-animated file from Lottie Creator: one .lottie, one animation per
// pose, named as in design/kopikas/README.md, with light and dark themes.
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
  const [player, setPlayer] = useState<DotLottie | null>(null);
  useEffect(() => {
    let on = true;
    hasFile().then((ok) => on && setReady(ok));
    return () => {
      on = false;
    };
  }, []);

  // The file's own light or dark theme, when it carries one.
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  useEffect(() => {
    if (!player) return;
    const apply = () => {
      if (player.manifest?.themes?.some((t) => t.id === theme)) player.setTheme(theme);
    };
    apply();
    player.addEventListener("load", apply);
    return () => player.removeEventListener("load", apply);
  }, [player, theme]);

  if (!(ready && !reduce && look === "painted" && SET_PIECES.includes(paintedPose))) return <KopikasMascot {...props} />;
  // The Lottie artboard carries a margin round the figure (148 by 156 units
  // against the figure's 124 by 150), so it sits offset by that margin.
  const unit = size / 124;
  return (
    <span className="relative block" style={{ width: size, height: 150 * unit }} aria-hidden>
      <DotLottieReact
        key={paintedPose}
        src={SRC}
        animationId={paintedPose}
        autoplay
        loop={!ONCE.includes(paintedPose)}
        dotLottieRefCallback={setPlayer}
        style={{ position: "absolute", left: -12 * unit, top: -6 * unit, width: 148 * unit, height: 156 * unit }}
      />
    </span>
  );
}
