"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// A number that rolls to its new value instead of jumping, so the eye can
// follow where the money went. The first value shows as is, whether it is
// there on the first render or arrives later (pass null until then): only
// changes animate. Reduced motion snaps.
export function useRollingNumber(value: number | null, duration = 0.6): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value ?? 0);
  const current = useRef(value);
  useEffect(() => {
    if (value === null || current.current === value) return;
    if (current.current === null || reduce) {
      current.current = value;
      setShown(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        current.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);
  return shown;
}

export function RollingNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  return <span className={className}>{format(useRollingNumber(value))}</span>;
}
