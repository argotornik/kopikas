import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { Pooleks } from "@/components/pooleks";
import { readDb } from "@/lib/storage";
import { sharedView } from "@/lib/shared-view";

export const dynamic = "force-dynamic";

// The shared ledger — one page for both of them, labels flipped by role.
export default async function PooleksPage() {
  const role = await currentRole();
  if (!role) redirect("/");
  // Rendered with its statement, not fetched after the page arrives.
  return <Pooleks role={role} initial={sharedView(await readDb(), role)} />;
}
