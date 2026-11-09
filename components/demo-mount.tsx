"use client";

import dynamic from "next/dynamic";
import { DEMO } from "@/lib/demo-flag";

// The demo's layer (components/demo-layer.tsx) as a chunk of its own, asked for only where the
// demo runs: imported straight from the layout, every deployment's pages would load it.
const DemoLayer = dynamic(() => import("@/components/demo-layer").then((m) => m.DemoLayer));
// Vercel Web Analytics counts the demo's visits: page views only, no cookies. The household's own
// board never loads it. It sends nothing until Analytics is enabled on the demo's Vercel project.
const Analytics = dynamic(() => import("@vercel/analytics/next").then((m) => m.Analytics));

export function DemoMount() {
  return DEMO ? (
    <>
      <DemoLayer />
      <Analytics />
    </>
  ) : null;
}
