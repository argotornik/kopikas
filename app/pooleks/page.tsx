import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageRole } from "@/lib/auth";
import { Pooleks } from "@/components/pooleks";
import { coinFonts } from "@/components/coin-fonts";
import { readDb } from "@/lib/storage";
import { sharedView } from "@/lib/shared-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pooleks · Kopikas" };

// The shared ledger — one page for both of them, labels flipped by role.
export default async function PooleksPage() {
  const role = await pageRole();
  if (!role) redirect("/");
  // Rendered with its statement, not fetched after the page arrives.
  return <Pooleks role={role} initial={sharedView(await readDb(), role)} fontClass={coinFonts} />;
}
