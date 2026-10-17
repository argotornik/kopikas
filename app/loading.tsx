import { BoardLoading } from "@/components/loading-views";

// While the board opens. The pages under it bring their own (Pooleks, Settings); the
// sketches borrow this one.
export default function Loading() {
  return <BoardLoading />;
}
