"use client";

import { useEffect } from "react";

// The painted cast blinks one face at a time: every second or two a timer picks a face on
// screen and shuts its eyes for a moment, quick to close and slower to open. Between blinks
// nothing runs, so a board of forty faces costs no more at rest than a board of none. A face
// is the svg its `.goofy-blink` groups sit in; a hidden tab or reduced motion skips the blink.
const SHUT: Keyframe[] = [
  { transform: "scaleY(1)" },
  { transform: "scaleY(0.1)", offset: 0.35 },
  { transform: "scaleY(1)" },
];

const onScreen = (face: SVGSVGElement) => {
  if (face.checkVisibility && !face.checkVisibility({ contentVisibilityAuto: true })) return false;
  const r = face.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
};

export function Blinker() {
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    const blink = () => {
      if (!document.hidden && !still.matches) {
        const eyes = document.querySelectorAll<SVGGElement>(".goofy-blink");
        const faces = [...new Set([...eyes].map((eye) => eye.ownerSVGElement))].filter((f) => f && onScreen(f));
        const face = faces[Math.floor(Math.random() * faces.length)];
        face?.querySelectorAll(".goofy-blink").forEach((eye) => eye.animate(SHUT, { duration: 220, easing: "ease-in-out" }));
      }
      timer = window.setTimeout(blink, 700 + Math.random() * 2300);
    };
    timer = window.setTimeout(blink, 1500);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
