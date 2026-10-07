"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type RefObject } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import { DotLottieReact, setWasmUrl, type DotLottie } from "@lottiefiles/dotlottie-react";
import { KopikasMascot } from "@/components/kopikas-mascot";
import type { PaintedPose } from "@/components/kopikas-painted";

// The player's renderer is served by Kopikas itself (copied into public/ on
// install), so no visitor's browser asks a public CDN for it.
setWasmUrl("/dotlottie-player.wasm");

// Kopikas's animations: one .lottie, one animation per pose, named as in
// design/kopikas/README.md, with light and dark themes. Built by
// npm run kopikas:lottie from the same data as the code-drawn Kopikas.
const SRC = "/kopikas.lottie";
// One-shots start at once, from their own opening, and hold their last frame;
// excited loops. Hover (friendly) stays code-drawn, so its eyes keep
// following the pointer.
const AT_ONCE: PaintedPose[] = ["hello", "jump", "excited", "proud"];
const ONCE: PaintedPose[] = ["hello", "jump", "proud"];
// Idle loops start from their still pose: the drawn figure springs into it
// first, as it always has, and the animation takes over once it has settled.
const AFTER_SETTLE: PaintedPose[] = ["saving", "budgeting", "resting"];
const SETTLE_MS = 400;

// Whether the file exists, asked once per page load. Until it does, every
// moment is code-drawn and nothing else changes.
let available: Promise<boolean> | null = null;
const hasFile = () => (available ??= fetch(SRC, { method: "HEAD" }).then((r) => r.ok, () => false));

// Kopikas, choosing per moment between the Lottie file and the code-drawn
// figure. The drawn figure is always there underneath, so poses still spring
// into each other; an animation covers it while it plays. Reduced motion
// always gets the code-drawn one, standing still.
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

  const animated = ready && !reduce && look === "painted";
  const [settled, setSettled] = useState<PaintedPose | null>(null);
  useEffect(() => {
    if (!animated || !AFTER_SETTLE.includes(paintedPose)) return;
    const t = setTimeout(() => setSettled(paintedPose), SETTLE_MS);
    // Leaving the pose forgets it settled, so coming back springs in again.
    return () => {
      clearTimeout(t);
      setSettled(null);
    };
  }, [animated, paintedPose]);
  // A pose has to last a frame before its animation starts, so one that is
  // overtaken at once (the last coin's jump, replaced by its cheer) never
  // starts a player only to cancel its download.
  const [steady, setSteady] = useState<PaintedPose | null>(null);
  useEffect(() => {
    if (!animated) return;
    const f = requestAnimationFrame(() => setSteady(paintedPose));
    return () => cancelAnimationFrame(f);
  }, [animated, paintedPose]);
  const drawn = useRef<HTMLSpanElement>(null);

  if (!animated) return <KopikasMascot {...props} />;
  const play = steady === paintedPose && (AT_ONCE.includes(paintedPose) || (AFTER_SETTLE.includes(paintedPose) && settled === paintedPose));
  return (
    <span className="relative block" style={{ width: size, height: (150 * size) / 124 }}>
      <span ref={drawn} className="block">
        <KopikasMascot {...props} />
      </span>
      {play && <Animation key={paintedPose} pose={paintedPose} size={size} theme={resolvedTheme === "dark" ? "dark" : "light"} drawn={drawn} />}
    </span>
  );
}

// One animation from the file, in a player of its own, over the drawn figure.
// The drawn figure is hidden in the same task the player first paints, so the
// two never overlap and Kopikas never blinks out; it shows again on the way out.
function Animation({ pose, size, theme, drawn }: { pose: PaintedPose; size: number; theme: "light" | "dark"; drawn: RefObject<HTMLSpanElement | null> }) {
  const [player, setPlayer] = useState<DotLottie | null>(null);
  const themeNow = useRef(theme);

  // Wired the moment the player is created, before its file has loaded, so
  // nothing is painted until the right animation and theme are in place.
  const wire = useCallback(
    (p: DotLottie | null) => {
      setPlayer(p);
      if (!p) return;
      // This player version ignores animationId at start-up and loads the
      // file's first animation, so the right one is picked as the file loads.
      // The player paints its first frame straight after this, in the same task.
      p.addEventListener("load", () => {
        if (p.activeAnimationId !== pose) p.loadAnimation(pose);
        if (p.manifest?.themes?.some((t) => t.id === themeNow.current)) p.setTheme(themeNow.current);
        if (drawn.current) drawn.current.style.visibility = "hidden";
      });
    },
    [pose, drawn],
  );
  useEffect(() => {
    const el = drawn.current;
    return () => {
      if (el) el.style.visibility = "";
    };
  }, [drawn]);
  // Light or dark mode changing while the animation plays.
  useEffect(() => {
    themeNow.current = theme;
    if (player?.isLoaded && player.manifest?.themes?.some((t) => t.id === theme)) player.setTheme(theme);
  }, [player, theme]);

  // The Lottie artboard carries a margin round the figure (148 by 156 units
  // against the figure's 124 by 150), so it sits offset by that margin.
  const unit = size / 124;
  return (
    <span className="absolute inset-0" aria-hidden>
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
