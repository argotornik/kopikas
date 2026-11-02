"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { tips, useTour, type Tour } from "@/lib/tips";
import { PARTNER_NAME } from "@/lib/names";
import { CrayonArrow, CrayonRing } from "@/components/crayon";
import { PaintedCoin } from "@/components/painted";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DISPLAY, FOCUS, INK, MUTED, OAT, PILL } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// The demo's own layer over the app (only on the demo's deployment): the bar that says it is
// made up, the tips written on the paper (Figma: Decisions, "Demo tips", concept A), and the card
// that ends the tour.

const REPO = "https://github.com/argotornik/kopikas";
const LINK = cn("relative underline-offset-2 hover:underline pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']", FOCUS);
// The crayon's blue, a step lighter on Oat Paper Night so the words keep their contrast.
const CRAYON_TEXT = "text-[#4C6FE0] dark:text-[#8FA6F0]";

export function DemoLayer() {
  return (
    <>
      <DemoBar />
      <DemoTips />
      <EndCard />
    </>
  );
}

function DemoBar() {
  const showTips = () => {
    tips.restart();
    if (window.location.pathname !== "/") window.location.assign("/");
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startOver = async () => {
    const { forgetDemo } = await import("@/lib/demo-browser");
    forgetDemo();
    tips.restart();
    window.location.assign("/");
  };
  return (
    <div className="bg-ink text-chalk dark:bg-mist-night">
      <div className="flex h-10 items-center justify-between gap-4 px-4 text-[13px] font-medium sm:px-6">
        <p className="flex min-w-0 items-center gap-2.5">
          <PaintedCoin size={18} seed={3} />
          <span className="truncate">
            Demo<span className="max-sm:hidden"> · a made-up household, so file away</span>
            <span className="sm:hidden"> · made-up household</span>
          </span>
        </p>
        <nav aria-label="Demo" className="flex shrink-0 items-center gap-5">
          <button type="button" onClick={showTips} className={LINK}>
            <span className="max-sm:hidden">Show tips</span>
            <span className="sm:hidden">Tips</span>
          </button>
          <button type="button" onClick={startOver} className={LINK}>
            Start over
          </button>
          <a href={`${REPO}#how-it-was-made`} target="_blank" rel="noreferrer" className={cn(LINK, "max-sm:hidden")}>
            How it was made
          </a>
        </nav>
      </div>
    </div>
  );
}

// ——— The tips ———

type Rect = { x: number; y: number; w: number; h: number };
type Point = [number, number];
// Where a tip's words go beside its anchor, what the ring goes round, and where the arrow ends.
type Spec = {
  anchor: Rect;
  place?: "left" | "right" | "above" | "below" | "below-left";
  ring?: Rect;
  point?: Point;
  // A tip whose words are written elsewhere (the phone's queue) still gets its arrow.
  arrow?: [Point, Point];
  tag?: string;
  title?: string;
  body?: string;
  next?: () => void;
  extra?: ReactNode;
};

const rectOf = (el: Element | null | undefined): Rect | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
};
const shown = (selector: string, within: ParentNode = document) =>
  [...within.querySelectorAll(selector)].find((el) => rectOf(el)) ?? null;
const union = (rs: Rect[]): Rect | null => {
  if (rs.length === 0) return null;
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};
const narrowNow = () => window.matchMedia("(max-width: 639px)").matches;
// What is painted inside a roll's button, which itself stands the floor's full height.
const drawn = (el: Element | null) =>
  el && union([...el.querySelectorAll("path, rect, ellipse, circle")].map(rectOf).filter((r): r is Rect => !!r && r.w < 400));

// Each tip, found on the page as it stands. Phone tips about the queue write their words in the
// queue itself (components/queue-tip.tsx); here they only draw the ring.
function specFor(tour: Tour, narrow: boolean): Spec | null {
  const { step, filing } = tour;
  const pile = shown("[data-coin]")?.parentElement;
  const stage = pile?.closest("section") ?? document;
  const rolls = [...stage.querySelectorAll("[data-roll]")].map(drawn).filter((r): r is Rect => !!r);
  const roll = (name: string) => drawn(shown(`[data-roll="${CSS.escape(name)}"]`, stage));
  const tallest = rolls.length ? rolls.reduce((a, b) => (b.h > a.h ? b : a)) : null;
  const next = () => tips.go(narrow ? "month" : "year");

  if (narrow) {
    const queue = shown("section[aria-labelledby='queue-heading']");
    const switchRect = rectOf(queue && shown("button[aria-label^='Always:']", queue));
    const label = rectOf(queue && shown("[data-tip='label']", queue));
    if (step === "pick" || step === "drop" || (step === "always" && !filing?.always))
      return switchRect
        ? {
            anchor: switchRect,
            ring: switchRect,
            arrow: label ? [[label.x + label.w + 8, label.y + label.h / 2 + 1], [switchRect.x - 16, switchRect.y + switchRect.h / 2]] : undefined,
          }
        : null;
    if (step === "always") {
      const line = queue && shown("[role=status]", queue);
      const said = line?.textContent?.includes("Undo") ? rectOf(line) : null;
      return said ? { anchor: said, ring: said } : null;
    }
    if (step === "month") {
      const tab = rectOf(document.querySelectorAll("nav[aria-label='Board views'] button")[1] ?? null);
      return tab && { anchor: tab, ring: tab, place: "above", tag: "Tip 3 of 4", title: "See the month", body: "Every category is a roll, as tall as what went into it." };
    }
  }
  if (step === "pick" && pile) {
    const r = rectOf(pile);
    return r && { anchor: r, ring: r, place: "left", tag: "Tip 1 of 4", title: "Pick up a coin!", body: "These are charges from the bank that nobody has filed yet." };
  }
  if (step === "drop" && pile) {
    const r = rectOf(pile), floor = union(rolls);
    return r && floor && { anchor: r, place: "left", point: [floor.x + floor.w * 0.45, floor.y - 12], tag: "Tip 2 of 4", title: "Now tap its roll", body: "With Always on, its shop's other coins go along, now and every month." };
  }
  if (step === "always" && filing) {
    const r = roll(filing.category) ?? (pile ? rectOf(pile) : null);
    if (!r) return null;
    const side = r.x + r.w / 2 < window.innerWidth / 2 ? "right" : "left";
    return filing.always
      ? {
          anchor: r,
          ring: r,
          place: side,
          tag: "Tip 3 of 4",
          title: "That's Always!",
          body:
            filing.others > 0
              ? `${filing.others} more from ${filing.shop} filed themselves, and every one to come will too.`
              : `Every charge to come from ${filing.shop} will file itself under ${filing.category}.`,
          next,
        }
      : {
          anchor: r,
          ring: r,
          place: side,
          tag: "Tip 3 of 4",
          title: "Now try Always",
          body: "Tap Always in the notice, or switch it on under the pile next time: the shop then files itself, every month.",
          next,
        };
  }
  if (step === "year" && tallest) {
    const side = tallest.x + tallest.w / 2 < window.innerWidth / 2 ? "right" : "left";
    return { anchor: tallest, ring: tallest, place: narrow ? "below" : side, tag: "Tip 4 of 4", title: "Tap a roll", body: "It shows that category's charges, and its last twelve months." };
  }
  if (step === "pooleks") {
    const link = rectOf(shown("a[href='/pooleks']"));
    return (
      link && {
        anchor: link,
        ring: link,
        place: "below-left",
        tag: "One more thing",
        title: "Pooleks",
        body: `Split a charge with ${PARTNER_NAME} from its menu, and it lands on your shared statement: nobody types it twice.`,
        extra: (
          <button type="button" onClick={() => tips.go("end")} className={cn("font-medium underline underline-offset-2", FOCUS)}>
            Finish the tour
          </button>
        ),
      }
    );
  }
  return null;
}

// Whether the phone's queue has said what Always just did: once its line has come and gone, the
// tip that rings it moves on by itself.
let saidSeen = false;

// Moves the tour on when the visitor has done what the tip says, read off the page. `since` is
// when the tip came up.
function advance(tour: Tour, narrow: boolean, since: number) {
  const { step } = tour;
  const held = !!shown("[data-coin][aria-pressed='true']");
  if (narrow && step === "always" && tour.filing?.always) {
    // The line says what a filing did, with Undo, for 6 s; then the switch's offer comes back.
    // Back on the page later (a reload), with nothing said, it moves on after a moment.
    const said = shown("section[aria-labelledby='queue-heading'] [role=status]")?.textContent?.includes("Undo");
    if (said) saidSeen = true;
    else if (saidSeen || Date.now() - since > 2000) {
      saidSeen = false;
      tips.go("month");
    }
  } else if (!narrow && step === "pick" && held) tips.go("drop");
  else if (!narrow && step === "drop" && !held) tips.go("pick");
  else if (step === "month" && document.querySelectorAll("nav[aria-label='Board views'] button")[1]?.getAttribute("aria-pressed") === "true") tips.go("year");
  else if (step === "year" && new URLSearchParams(window.location.search).get("cat")) tips.go("pooleks");
  else if (step === "pooleks" && window.location.pathname === "/pooleks") tips.go("end");
}

function DemoTips() {
  const tour = useTour();
  const [spec, setSpec] = useState<Spec | null>(null);
  const [mounted, setMounted] = useState(false);
  const words = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => setMounted(true), []);
  // Read the page again whenever it moves: a scroll, a resize, a coin hopping, a roll growing.
  useEffect(() => {
    if (tour.step === "off" || tour.step === "end") {
      setSpec(null);
      return;
    }
    let frame = 0;
    const since = Date.now();
    const read = () => {
      frame = 0;
      const narrow = narrowNow();
      advance(tour, narrow, since);
      setSpec(specFor(tour, narrow));
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    // A page at rest sends no changes, so the tip also looks once a second.
    const tick = setInterval(soon, 1000);
    const mo = new MutationObserver(soon);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "style", "class", "data-coin"] });
    window.addEventListener("scroll", soon, { capture: true, passive: true });
    window.addEventListener("resize", soon);
    window.addEventListener("popstate", soon);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearInterval(tick);
      mo.disconnect();
      window.removeEventListener("scroll", soon, { capture: true });
      window.removeEventListener("resize", soon);
      window.removeEventListener("popstate", soon);
    };
  }, [tour]);
  useLayoutEffect(() => {
    const el = words.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec?.title]);

  if (!mounted || !spec) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.min(narrowNow() ? 300 : 272, vw - 32);
  const { anchor: a } = spec;
  const gap = narrowNow() ? 44 : 84;
  // On a phone the tab bar holds the foot of the screen. Words with no room below go above.
  const floor = vh - (narrowNow() ? 84 : 8);
  const place = spec.place === "below" && a.y + a.h + gap + size.h > floor ? "above" : spec.place;
  let x = 0, y = 0;
  if (place === "left") [x, y] = [a.x - gap - W, a.y + a.h / 2 - size.h / 2];
  if (place === "right") [x, y] = [a.x + a.w + gap, a.y + Math.min(a.h / 2 - size.h / 2, 24)];
  if (place === "above") [x, y] = [a.x + a.w / 2 - W / 2, a.y - gap - size.h];
  if (place === "below") [x, y] = [a.x + a.w / 2 - W / 2, a.y + a.h + gap];
  // Under and to the left: clear of whatever stands below the anchor (the pile, under Pooleks).
  if (place === "below-left") [x, y] = [a.x - W - 8, a.y + a.h + 36];
  // The words' paper reaches 12px past them: it keeps the page's 16px margin.
  x = Math.max(28, Math.min(x, vw - W - 28));
  y = Math.max(8, Math.min(y, (spec.place === "above" ? vh - 8 : floor) - size.h));
  // The arrow leaves the words on the side facing what it points at, and stops short of the ring.
  // A point below the words (the floor, from the head) is reached from their foot.
  const target: Point = spec.point ?? [a.x + a.w / 2, a.y + a.h / 2];
  const from: Point = spec.point
    ? [x + W * 0.35, y + size.h + 10]
    : place === "left"
      ? [x + W + 10, y + size.h / 2]
      : place === "right"
        ? [x - 10, y + Math.min(size.h / 2, 40)]
        : place === "above"
          ? [x + W / 2, y + size.h + 8]
          : place === "below-left"
            ? [x + W - 16, y - 10]
            : [x + W / 2, y - 8];
  const to: Point = spec.point
    ? target
    : place === "left"
      ? [a.x - 18, target[1]]
      : place === "right"
        ? [a.x + a.w + 18, target[1]]
        : place === "above"
          ? [target[0], a.y - 16]
          : place === "below-left"
            ? [a.x + a.w * 0.25, a.y + a.h + 14]
            : [target[0], a.y + a.h + 16];

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[45]" key={tour.step + (tour.filing?.always ? "+" : "")}>
      {spec.ring && <CrayonRing {...spec.ring} />}
      {spec.arrow && spec.arrow[1][0] - spec.arrow[0][0] > 24 && <CrayonArrow from={spec.arrow[0]} to={spec.arrow[1]} bend={-6} />}
      {spec.title && size.h > 0 && Math.hypot(to[0] - from[0], to[1] - from[1]) > 40 && (
        <CrayonArrow from={from} to={to} bend={place === "left" || place === "right" ? -16 : 12} />
      )}
      {spec.title && (
        <Words ref={words} x={x} y={y} w={W} spec={spec} />
      )}
    </div>,
    document.body
  );
}

function Words({ ref, x, y, w, spec }: { ref: React.Ref<HTMLDivElement>; x: number; y: number; w: number; spec: Spec }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      role="status"
      className={cn("pointer-events-auto absolute rounded-2xl px-3 py-2.5", OAT)}
      style={{ left: x - 12, top: y - 10, width: w + 24 }}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className={cn("text-[12px]", MUTED)}>
        {spec.tag} ·{" "}
        <button type="button" onClick={() => tips.go("off")} className={cn("underline underline-offset-2 hover:text-ink dark:hover:text-chalk", FOCUS)}>
          Skip the tips
        </button>
      </p>
      <p className={cn(DISPLAY, CRAYON_TEXT, "mt-1 text-[22px] font-semibold leading-tight")}>{spec.title}</p>
      <p className="mt-1 text-[15px] leading-snug text-ink dark:text-chalk">{spec.body}</p>
      {(spec.next || spec.extra) && (
        <p className="mt-2 flex gap-4 text-[15px] text-ink dark:text-chalk">
          {spec.next && (
            <button type="button" onClick={spec.next} className={cn("font-medium underline underline-offset-2", FOCUS)}>
              Next tip
            </button>
          )}
          {spec.extra}
        </p>
      )}
    </motion.div>
  );
}

// ——— The end of the tour ———

function EndCard() {
  const tour = useTour();
  const mist = cn(PILL, "inline-flex items-center justify-center whitespace-nowrap bg-mist text-ink hover:bg-mist-hover dark:bg-mist-night dark:text-chalk dark:hover:bg-card-night-hover", FOCUS);
  return (
    <Dialog open={tour.step === "end"} onOpenChange={(open) => !open && tips.go("off")}>
      <DialogContent className="gap-0 rounded-[28px] p-0 sm:max-w-[500px]">
        <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center sm:px-9">
          <PaintedCoin size={64} seed={3} />
          <DialogTitle className={cn(DISPLAY, "mt-4 text-[34px] font-semibold leading-none sm:text-[40px]")}>That&apos;s Kopikas</DialogTitle>
          <DialogDescription className="mt-3 text-[15px] leading-snug text-ink dark:text-chalk">
            With a real bank behind it, every charge arrives by itself and Always keeps filing them: the month at a glance, nothing typed twice.
          </DialogDescription>
          <div className={cn("mt-5 w-full rounded-[18px] px-4 py-3.5", OAT)}>
            <p className={cn(DISPLAY, "text-[16px] font-semibold")}>How it was made</p>
            <p className={cn("mt-1 text-[15px] leading-snug", MUTED)}>
              Made by Argo Tornik with Claude Code, every screen designed in Figma first. The code is open on GitHub.
            </p>
          </div>
          <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <button type="button" onClick={() => tips.go("off")} className={cn(PILL, INK, "whitespace-nowrap", FOCUS)}>
              Keep playing
            </button>
            <a href={REPO} target="_blank" rel="noreferrer" className={mist}>
              See the code
            </a>
            <a href={`${REPO}#deploying-your-own`} target="_blank" rel="noreferrer" className={mist}>
              Deploy your own
            </a>
          </div>
          <p className={cn("mt-4 text-[12px]", MUTED)}>Works with LHV accounts in Estonia today.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
