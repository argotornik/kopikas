"use client";

import dynamic from "next/dynamic";
import { DEMO } from "@/lib/demo-flag";

// The demo's layer (components/demo-layer.tsx) as a chunk of its own, asked for only where the
// demo runs: imported straight from the layout, every deployment's pages would load it.
const DemoLayer = dynamic(() => import("@/components/demo-layer").then((m) => m.DemoLayer));

export function DemoMount() {
  return DEMO ? <DemoLayer /> : null;
}
