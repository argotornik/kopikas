import { redirect } from "next/navigation";

// Anni's old bookmark keeps working: the shared page is Pooleks now.
export default function AnniPage() {
  redirect("/pooleks");
}
