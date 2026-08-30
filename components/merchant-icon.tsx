"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Favicon when we know the domain, letter avatar otherwise (or on load failure).
export function MerchantIcon({
  name,
  domain,
  className,
}: {
  name: string;
  domain: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    const letter = name.replace(/[^\p{L}\p{N}]/gu, "").charAt(0).toUpperCase() || "·";
    return (
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground",
          className
        )}
        aria-hidden
      >
        {letter}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/icon?domain=${domain}`}
      alt=""
      className={cn("size-7 shrink-0 rounded-full border bg-card object-contain p-0.5", className)}
      onError={() => setFailed(true)}
    />
  );
}
