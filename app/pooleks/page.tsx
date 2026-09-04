import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import { Pooleks } from "@/components/pooleks";

export const dynamic = "force-dynamic";

// The shared ledger — one page for both of them, labels flipped by role.
export default async function PooleksPage() {
  const role = await currentRole();
  if (!role) redirect("/");
  return <Pooleks role={role} />;
}
