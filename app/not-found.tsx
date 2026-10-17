import type { Metadata } from "next";
import { NotFoundView } from "@/components/not-found-view";

export const metadata: Metadata = { title: "Not found · Kopikas" };

// Any address the app doesn't know.
export default function NotFound() {
  return <NotFoundView />;
}
