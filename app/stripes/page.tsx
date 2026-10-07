import { redirect } from "next/navigation";
import { Schibsted_Grotesk } from "next/font/google";
import { StripesPrototype } from "@/components/stripes-prototype";
import { getAccounts, readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

// The striped-skirts direction, tried on the first viewport only, beside the
// current board. Same data, nothing saved: a probe, not a replacement.
const schibsted = Schibsted_Grotesk({ subsets: ["latin", "latin-ext"] });

export const dynamic = "force-dynamic";

export default async function StripesPage() {
  if ((await currentRole()) !== "owner") redirect("/");
  const [db, { fetchedAt }] = await Promise.all([readDb(), getAccounts()]);
  if (db.transactions.length === 0) redirect("/");
  return <StripesPrototype initial={buildBoard(db, new Date())} syncedAt={fetchedAt} fontClass={schibsted.className} />;
}
