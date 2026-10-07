import { Fredoka } from "next/font/google";
import { KopikasMascot } from "@/components/kopikas-mascot";
import type { PaintedPose } from "@/components/kopikas-painted";
import { PaintedDefs } from "@/components/painted";

// Kopikas's character sheet, live: every pose, and the moment it belongs to.
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"] });

const POSES: { pose: PaintedPose; name: string; when: string }[] = [
  { pose: "hello", name: "Happy & wave", when: "Arriving on the board" },
  { pose: "saving", name: "Saving", when: "Loose change waiting to be filed" },
  { pose: "budgeting", name: "Budgeting", when: "Holding a coin you are filing" },
  { pose: "jump", name: "Jumping", when: "A coin just landed in its roll" },
  { pose: "excited", name: "Excited", when: "Everything is sorted" },
  { pose: "resting", name: "Resting", when: "Nothing to file" },
  { pose: "proud", name: "Proud", when: "A past month came in under the one before" },
  { pose: "friendly", name: "Waving", when: "Hovered" },
];

export default function KopikasSheet() {
  return (
    <div className="min-h-dvh bg-white px-5 py-10 text-[#16171C] dark:bg-[#0F1015] dark:text-[#F3F2EE]">
      <PaintedDefs />
      <h1 className={`${fredoka.className} text-center text-[40px] font-semibold`}>Kopikas</h1>
      <p className="mt-1 text-center text-[15px] text-[#63666F] dark:text-[#A7A9B4]">Character sheet: a pose for each moment of the board</p>
      <div className="mx-auto mt-8 grid max-w-[1100px] grid-cols-2 gap-4 sm:grid-cols-4">
        {POSES.map((p) => (
          <figure key={p.pose} className="flex flex-col items-center rounded-[24px] bg-[#EFEBE3] px-3 pb-5 pt-6 dark:bg-[#1F1D22]">
            <KopikasMascot look="painted" paintedPose={p.pose} size={140} />
            <figcaption className="mt-3 text-center">
              <div className={`${fredoka.className} text-[18px] font-semibold`}>{p.name}</div>
              <div className="text-[13px] text-[#63666F] dark:text-[#A7A9B4]">{p.when}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
