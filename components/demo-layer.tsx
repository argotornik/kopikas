"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { handOff, onSettled, tips, TIPS_BUTTON, useTour, type TipStep, type Tour } from "@/lib/tips";
import { PARTNER_NAME } from "@/lib/names";
import { CrayonArrow, CrayonRing, CrayonUnderline } from "@/components/crayon";
import { PaintedCoin } from "@/components/painted";
import { CRAYON_TEXT } from "@/components/queue-tip";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DISPLAY, FOCUS, INK, MUTED, OAT, PILL } from "@/components/coin-look";
import { cn } from "@/lib/utils";

// The demo's own layer over the app (only on the demo's deployment): the bar that says it is
// made up, the tips written on the paper (Figma: Decisions, "Demo tips", concept A), and the card
// that ends the tour.

const REPO = "https://github.com/argotornik/kopikas";
// The bar is Ink in light mode too, so its focus ring is Chalk in both.
const LINK = cn("relative underline-offset-2 hover:underline pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']", FOCUS, "focus-visible:outline-chalk");
// A tip's small text buttons, 44px to press on a touch screen however small they read.
const TAP = "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-['']";
// The board's pills give a little under the thumb; so do the end card's.
const PRESS = "transition-transform motion-safe:active:scale-[0.96]";

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
  const { step } = useTour();
  const touring = step !== "off" && step !== "end";
  const showTips = async () => {
    const { demoLeft } = await import("@/lib/demo-browser");
    const narrow = narrowNow();
    // With every coin filed, the tour starts at the first tip that still has something to do.
    const from: TipStep = demoLeft() > 0 ? "pick" : narrow ? "month" : "year";
    tips.restart(from);
    // A board opened afresh shows what that tip is about: To file, or a month with loose change.
    if (window.location.pathname !== "/" || !specFor({ step: from }, narrow)) window.location.assign("/");
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
            <span className="sm:hidden"> household</span>
          </span>
        </p>
        <nav aria-label="Demo" className="flex shrink-0 items-center gap-5">
          {/* While the tour runs, the way out of it is the first thing a keyboard reaches. One
              button either way, so focus stays on it as it turns from one to the other. */}
          <button id={TIPS_BUTTON} type="button" onClick={touring ? () => tips.go("off") : showTips} className={LINK}>
            {touring ? (
              "Skip tips"
            ) : (
              <>
                <span className="max-sm:hidden">Show tips</span>
                <span className="sm:hidden">Tips</span>
              </>
            )}
          </button>
          {/* The code stays a tap away on a phone too, after the end card is closed. */}
          <a href={`${REPO}#how-it-was-made`} target="_blank" rel="noreferrer" className={cn(LINK, "max-sm:hidden")}>
            How it was made
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className={cn(LINK, "sm:hidden")}>
            Code
          </a>
          <button type="button" onClick={startOver} className={LINK}>
            Start over
          </button>
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
  // "foot": at the foot of a phone's screen, over its tab bar, for an anchor up top.
  place?: "left" | "right" | "above" | "below" | "below-left" | "foot";
  ring?: Rect;
  // Words too wide to ring are underlined.
  underline?: Rect;
  point?: Point;
  // A tip whose words are written elsewhere (the phone's queue) still gets its arrow.
  arrow?: [Point, Point];
  // Two lines in a strip of room (the header): the title runs into its sentence.
  compact?: boolean;
  tag?: string;
  title?: string;
  body?: string;
  next?: (e: { detail: number }) => void;
  extra?: ReactNode;
  // What a screen reader hears, when the words are not the tip's own (the phone's queue).
  say?: string;
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
// What is painted inside a roll's button, which itself stands the floor's full height: where it
// stands, not where it has bobbed to while a coin is held, so an arrow to the floor keeps still.
const drawn = (el: Element | null) => {
  const box = el && union([...el.querySelectorAll("path, rect, ellipse, circle")].map(rectOf).filter((r): r is Rect => !!r && r.w < 400));
  if (!el || !box) return box;
  const bob = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return { ...box, x: box.x - bob.m41, y: box.y - bob.m42 };
};

// Each tip, found on the page as it stands. Phone tips about the queue write their words in the
// queue itself (components/queue-tip.tsx); here they only draw the ring.
function specFor(tour: Tour, narrow: boolean): Spec | null {
  const { step, filing } = tour;
  const pile = shown("[data-coin]")?.parentElement;
  const stage = pile?.closest("section") ?? document;
  // Every roll's painting, shape by shape: measured only by the tips that need them.
  const rolls = () => [...stage.querySelectorAll("[data-roll]")].map(drawn).filter((r): r is Rect => !!r);
  const roll = (name: string) => drawn(shown(`[data-roll="${CSS.escape(name)}"]`, stage));
  const next = (e: { detail: number }) => {
    handOff(e);
    tips.go(narrow ? "month" : "year");
  };

  if (narrow) {
    const queue = shown("section[aria-labelledby='queue-heading']");
    // First the coin (the painting over its shop's name), what a charge from the bank looks like
    // here; the line over the tiles says to tap where it goes.
    if (step === "pick" || step === "drop") {
      const coin = rectOf(queue && document.getElementById("queue-heading")?.previousElementSibling);
      return coin && { anchor: coin, ring: coin, say: "Tip 1 of 4. This is a charge from the bank. Tap where it goes." };
    }
    // Then, on the next coin, the switch. Once it's on, the label says to tap a tile, and the ring
    // has done its work.
    if (step === "always" && !filing?.always) {
      const toggle = queue && shown("button[aria-label^='Always:']", queue);
      const at = rectOf(toggle);
      if (!at) return null;
      if (toggle?.getAttribute("aria-pressed") === "true") return { anchor: at, say: "Now tap where it goes." };
      const label = rectOf(shown("[data-tip='label']", queue ?? document));
      return {
        anchor: at,
        ring: at,
        arrow: label ? [[label.x + label.w + 8, label.y + label.h / 2 + 1], [at.x - 16, at.y + at.h / 2]] : undefined,
        say: "Tip 2 of 4. Try Always on this one: it files the shop's other charges with it, now and every month.",
      };
    }
    if (step === "always") {
      // The line runs the queue's width with Undo at its end, so it is underlined rather than
      // ringed: under its words (its pieces), not its box, which keeps a second line's room.
      const line = queue && shown("[role=status]", queue)?.querySelector("span");
      const said = line?.textContent?.includes("Undo") ? union([...line.children].map(rectOf).filter((r): r is Rect => !!r)) : null;
      return said ? { anchor: said, underline: said, say: "Tip 2 of 4. That's Always!" } : null;
    }
    if (step === "month") {
      const tab = rectOf(document.querySelectorAll("nav[aria-label='Board views'] button")[1] ?? null);
      // On a phone the rolls lie down, so they run as long as what went in, not as tall.
      return tab && { anchor: tab, ring: tab, place: "above", tag: "Tip 3 of 4", title: "See the month", body: "Every category is a roll, as long as what went into it." };
    }
  }
  // The coins themselves, not the pile's box: it is a fixed square the coins only partly fill.
  const coins = union([...(pile?.querySelectorAll("[data-coin]") ?? [])].map(rectOf).filter((r): r is Rect => !!r));
  if (step === "pick" && coins) {
    return { anchor: coins, ring: coins, place: "left", tag: "Tip 1 of 4", title: "Pick up a coin!", body: "These are charges from the bank that nobody has filed yet." };
  }
  if (step === "drop" && coins) {
    const r = coins, floor = union(rolls());
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
            filing.total > 1
              ? `All ${filing.total} from ${filing.shop} are filed now, and every one to come will be too.`
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
  const tallest = step === "year" ? rolls().reduce<Rect | null>((a, b) => (a && a.h >= b.h ? a : b), null) : null;
  if (step === "year" && tallest) {
    const side = tallest.x + tallest.w / 2 < window.innerWidth / 2 ? "right" : "left";
    return { anchor: tallest, ring: tallest, place: narrow ? "below" : side, tag: "Tip 4 of 4", title: "Tap a roll", body: "It shows that category's charges, and its last twelve months." };
  }
  const finish = (
    <button type="button" onClick={() => tips.go("end")} className={cn(TAP, "font-medium underline underline-offset-2", FOCUS)}>
      Finish the tour
    </button>
  );
  // On Pooleks itself, the tab it keeps, before the end card: the visitor sees what they came for.
  if (step === "pooleks" && window.location.pathname === "/pooleks") {
    const head = shown("section[aria-label='Where the tab stands']");
    // The amount, the last line above the buttons: its letters, not its line, which runs the
    // panel's width. A ring is an ellipse, so it takes a little more room either side of them.
    const amount = [...(head?.querySelectorAll(":scope > div > p") ?? [])].at(-1);
    const range = document.createRange();
    if (amount) range.selectNodeContents(amount);
    const r = amount ? range.getBoundingClientRect() : null;
    const balance = r && r.width > 0 ? { x: r.left - r.width * 0.125, y: r.top, w: r.width * 1.25, h: r.height } : null;
    return (
      balance && {
        anchor: balance,
        ring: balance,
        place: narrow ? "foot" : "right",
        tag: "One more thing",
        title: "The shared tab",
        body: `Every split lands here and the tab keeps itself. When ${PARTNER_NAME} pays you back, record it with Settle up.`,
        extra: finish,
      }
    );
  }
  if (step === "pooleks") {
    const link = rectOf(shown("a[href='/pooleks']"));
    // On a wide screen anything under the link is a card (the charges, the tray), so the words
    // stay in the header's own white space, beside it. On a phone they wait at the foot of the
    // screen, clear of the month's name and total.
    return (
      link && {
        anchor: link,
        ring: link,
        place: narrow ? "foot" : "left",
        compact: !narrow,
        tag: "One more thing",
        title: "Pooleks",
        // One line in the header, so it stays out of the cards under it.
        body: narrow
          ? `The ringed icon up top. Split a charge with ${PARTNER_NAME} from its menu, and it lands on your shared statement.`
          : `Split a charge with ${PARTNER_NAME}, and it lands on your shared statement.`,
        extra: finish,
      }
    );
  }
  return null;
}

// Whether the phone's queue has said what Always just did: once its line has come and gone, the
// tip that rings it moves on by itself.
let saidSeen = false;

// How long each of these has held, for the moves that wait a moment.
const lasting = new Map<string, number>();
function lasted(what: string, now: boolean) {
  if (!now) {
    lasting.delete(what);
    return 0;
  }
  if (!lasting.has(what)) lasting.set(what, Date.now());
  return Date.now() - lasting.get(what)!;
}

// Moves the tour on when the visitor has done what the tip says, read off the page. `since` is
// when the tip came up.
function advance(tour: Tour, narrow: boolean, since: number) {
  const { step } = tour;
  const held = !!shown("[data-coin][aria-pressed='true']");
  // A coin let go hops to its roll for 0.7 s before the filing is told, so only one still let go
  // after that was put back down. A roll just tapped draws its year before Pooleks is pointed out.
  const letGo = lasted("let go", !narrow && step === "drop" && !held);
  const chosen = lasted("chosen", step === "year" && !!new URLSearchParams(window.location.search).get("cat"));
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
  else if (letGo > 1200) tips.go("pick");
  else if (step === "month" && document.querySelectorAll("nav[aria-label='Board views'] button")[1]?.getAttribute("aria-pressed") === "true") tips.go("year");
  else if (chosen > 900) tips.go("pooleks");
}

// What a tip draws, as text: a page that moved without moving the tip draws nothing new.
const drawnAs = (s: Spec | null) =>
  s && JSON.stringify([s.anchor, s.ring, s.underline, s.point, s.arrow, s.place, s.title, s.body, !!s.next].map((v) => (typeof v === "object" && v && "x" in v ? [v.x, v.y, v.w, v.h].map(Math.round) : v)));

function DemoTips() {
  const tour = useTour();
  const reduce = useReducedMotion();
  const [spec, setSpec] = useState<Spec | null>(null);
  const shown = useRef<string | null>(null);
  const words = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // What a screen reader hears: one region that stays, so each tip is heard as it comes.
  const [say, setSay] = useState("");
  // The first tip waits for the pile to land (its coins drop in over half a second) and for the
  // board this browser kept, so its ring goes round the coins that stay.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let landed = false, kept = false;
    const go = () => landed && kept && setReady(true);
    const land = setTimeout(() => ((landed = true), go()), reduce ? 0 : 600);
    const late = setTimeout(() => ((kept = true), go()), 2500);
    const off = onSettled(() => ((kept = true), go()));
    return () => {
      clearTimeout(land);
      clearTimeout(late);
      off();
    };
  }, [reduce]);
  // Read the page again whenever it moves: a scroll, a resize, a coin hopping, a roll growing.
  useEffect(() => {
    if (tour.step === "off" || tour.step === "end") {
      shown.current = null;
      setSpec(null);
      setSay("");
      return;
    }
    let frame = 0;
    const since = Date.now();
    const read = () => {
      frame = 0;
      const narrow = narrowNow();
      advance(tour, narrow, since);
      const found = specFor(tour, narrow);
      if (found) setSay(found.say ?? (found.title ? `${found.tag}. ${found.title.replace(/[^.!?]$/, "$&.")} ${found.body}` : ""));
      // Words whose anchor has scrolled out of sight fade, and come back with it; the step stays.
      // Words at the foot of a phone's screen point up the page wherever it is.
      const away = !!found && found.place !== "foot" && (found.anchor.y + found.anchor.h < 0 || found.anchor.y > window.innerHeight);
      const next = away ? null : found;
      const as = drawnAs(next);
      if (as === shown.current) return;
      shown.current = as;
      setSpec(next);
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    // A page at rest sends no changes, so the tip also looks once a second.
    const tick = setInterval(soon, 1000);
    // Not for the tips' own drawing, nor for the rolls bobbing while a coin is held: a bob moves no
    // tip, and reading every roll each frame made the drop tip's arrow bob along.
    const mo = new MutationObserver((changes) => {
      const held = !!document.querySelector("[data-coin][aria-pressed='true']");
      const moved = (c: MutationRecord) =>
        !layer.current?.contains(c.target) && !(held && c.attributeName === "style" && (c.target as Element).closest("[data-roll], [data-jar]"));
      if (changes.some(moved)) soon();
    });
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
  }, [spec?.title, ready]);

  // A phone's tip at the foot of the screen would cover the page's end for as long as it waits:
  // the page gets that much more room at its foot, so every row can scroll clear of it. Set only
  // when the room changes: taken away for a moment as the page scrolls, it would cut the scroll short.
  const atFoot = !!spec?.title && size.h > 0 && narrowNow() && (spec.place === "foot" || spec.anchor.y > window.innerHeight - 84);
  const room = atFoot ? Math.round(window.innerHeight - 84 - (layout(spec, size).y - 10) + 16) : 0;
  useEffect(() => {
    if (!room) return;
    document.body.style.paddingBottom = `${room}px`;
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [room]);

  const key = tour.step + (tour.filing?.always ? "+" : "");
  // Right after the bar on the page, so a keyboard reaches a tip's buttons before the board's.
  return (
    <div ref={layer}>
      <p aria-live="polite" className="sr-only">
        {ready ? say : ""}
      </p>
      {ready && (
        <div className="pointer-events-none fixed inset-0 z-[45]">
          {spec && <Drawing key={key} spec={spec} size={size} />}
          {/* The words fade out quicker than they came, as the next tip draws itself in. */}
          <AnimatePresence>{spec?.title && <Placed key={key} spec={spec} size={size} words={words} />}</AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Where a tip's words go and where its arrow runs, from its anchor and the words' own size.
function layout(spec: Spec, size: { w: number; h: number }) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const { anchor: a } = spec;
  // A compact tip takes the header's room between the wordmark (about 216px) and its anchor.
  const gap = spec.compact ? 56 : narrowNow() ? 44 : 84;
  const W = spec.compact ? Math.max(240, Math.min(560, a.x - gap - 216)) : Math.min(narrowNow() ? 300 : 272, vw - 32);
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
  if (place === "foot") [x, y] = [vw / 2 - W / 2, floor - size.h];
  // The words' paper reaches 12px past them: it keeps the page's 16px margin.
  x = Math.max(28, Math.min(x, vw - W - 28));
  y = Math.max(8, Math.min(y, (spec.place === "above" ? vh - 8 : floor) - size.h));
  // A compact tip lives in the header: below the demo bar, never over it.
  if (spec.compact) y = Math.max(y, (document.querySelector("header")?.getBoundingClientRect().top ?? 0) + 16);
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
  return { x, y, W, place, from, to };
}

// The crayon: a tip's ring and arrows, drawn in afresh with each tip and simply gone with it.
function Drawing({ spec, size }: { spec: Spec; size: { w: number; h: number } }) {
  const { place, from, to } = layout(spec, size);
  return (
    <>
      {spec.ring && <CrayonRing {...spec.ring} />}
      {spec.underline && <CrayonUnderline {...spec.underline} />}
      {spec.arrow && spec.arrow[1][0] - spec.arrow[0][0] > 24 && <CrayonArrow from={spec.arrow[0]} to={spec.arrow[1]} bend={-6} />}
      {/* Words at the foot of the screen name what the ring is round; an arrow up the page would cross it all. */}
      {spec.title && size.h > 0 && place !== "foot" && Math.hypot(to[0] - from[0], to[1] - from[1]) > 40 && (
        <CrayonArrow from={from} to={to} bend={place === "left" || place === "right" ? -16 : 12} />
      )}
    </>
  );
}

// The words, placed by transform; they rise in on their scrap of paper and fade out quicker. The
// scrap has the notice's hairline edge, so rows passing under it read as covered, not cut.
function Placed({ spec, size, words }: { spec: Spec; size: { w: number; h: number }; words: React.RefObject<HTMLDivElement | null> }) {
  const reduce = useReducedMotion();
  const { x, y, W } = layout(spec, size);
  const skip = (e: { detail: number }) => {
    handOff(e);
    tips.go("off");
  };
  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{ width: W + 24, transform: `translate3d(${x - 12}px, ${y - 10}px, 0)` }}
      initial={false}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
    >
      <motion.div
        ref={words}
        className={cn("pointer-events-auto rounded-2xl px-3 py-2.5 ring-1 ring-ink/10 dark:ring-white/10", OAT)}
        initial={reduce ? false : { opacity: 0, transform: "translateY(6px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {spec.compact ? (
          <>
            <p className="text-[15px] leading-snug text-ink dark:text-chalk">
              <span className={cn(DISPLAY, CRAYON_TEXT, "mr-1.5 text-[20px] font-semibold")}>{spec.title}</span>
              {spec.body}
            </p>
            <p className={cn("mt-1 text-[12px]", MUTED)}>
              {spec.tag} ·{" "}
              <button type="button" onClick={skip} className={cn(TAP, "underline underline-offset-2 hover:text-ink dark:hover:text-chalk", FOCUS)}>
                Skip the tips
              </button>{" "}
              · <span className="text-ink dark:text-chalk">{spec.extra}</span>
            </p>
          </>
        ) : (
          <>
            <p className={cn("text-[12px]", MUTED)}>
              {spec.tag} ·{" "}
              <button type="button" onClick={skip} className={cn(TAP, "underline underline-offset-2 hover:text-ink dark:hover:text-chalk", FOCUS)}>
                Skip the tips
              </button>
            </p>
            <p className={cn(DISPLAY, CRAYON_TEXT, "mt-1 text-[22px] font-semibold leading-tight")}>{spec.title}</p>
            <p className="mt-1 text-[15px] leading-snug text-ink dark:text-chalk">{spec.body}</p>
          </>
        )}
        {!spec.compact && (spec.next || spec.extra) && (
          <p className="mt-2 flex gap-4 text-[15px] text-ink dark:text-chalk">
            {spec.next && (
              <button type="button" onClick={spec.next} className={cn(TAP, "font-medium underline underline-offset-2", FOCUS)}>
                Next tip
              </button>
            )}
            {spec.extra}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ——— The end of the tour ———

function EndCard() {
  const tour = useTour();
  const reduce = useReducedMotion();
  const mist = cn(PILL, PRESS, "inline-flex items-center justify-center whitespace-nowrap bg-mist text-ink hover:bg-mist-hover dark:bg-mist-night dark:text-chalk dark:hover:bg-card-night-hover", FOCUS);
  return (
    <Dialog open={tour.step === "end"} onOpenChange={(open) => !open && tips.go("off")}>
      {/* A short screen (a phone's in-app browser, or one on its side) scrolls the card. Closed,
          it leaves focus on the bar's tips button, where the tour can be started again. */}
      <DialogContent
        finalFocus={() => document.getElementById(TIPS_BUTTON)}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-[28px] p-0 sm:max-w-[520px]"
      >
        <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center sm:px-9">
          {/* The tour's finish line, seen once: the coin hops in on a spring as the card opens. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, transform: "translateY(-14px) scale(0.9)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.25, delay: 0.08 }}
          >
            <PaintedCoin size={64} seed={3} />
          </motion.div>
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
          {/* The code first: most visitors come from a post about how it was made. */}
          <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <a href={REPO} target="_blank" rel="noreferrer" className={cn(PILL, INK, PRESS, "inline-flex items-center justify-center whitespace-nowrap", FOCUS)}>
              See the code
            </a>
            <a href={`${REPO}#deploying-your-own`} target="_blank" rel="noreferrer" className={mist}>
              Deploy your own
            </a>
            <button type="button" onClick={() => tips.go("off")} className={mist}>
              Keep playing
            </button>
          </div>
          <p className={cn("mt-4 text-[12px]", MUTED)}>Works with LHV accounts in Estonia today.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
