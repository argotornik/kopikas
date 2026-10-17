"use client";

import { useEffect } from "react";
import { Toast } from "@base-ui/react/toast";
import { CircleAlertIcon, XIcon } from "lucide-react";
import { act, type Undo } from "@/lib/act";
import { cn } from "@/lib/utils";
import { FOCUS, MUTED } from "@/components/coin-look";

// One notice area for every page, at the foot of the screen like the last
// line of a statement. Base UI makes it a landmark (F6 jumps in) and a live
// region, so what it says is announced without stealing focus.
export const toasts = Toast.createToastManager();

// The most recent change that can still be taken back, for ⌘Z / Ctrl+Z.
let latestUndo: { id: string; run: () => void } | null = null;

// A second thing a notice offers beside Undo, such as Always after a filing.
type Also = { label: string; onClick: () => void };

// After a change that can be taken back: say what happened and offer Undo
// for a while. `after` brings the page up to date once the undo has landed.
export function announceUndoable(message: string, undo: Undo | undefined, after: () => unknown, also?: Also) {
  if (!undo) {
    toasts.add({ title: message, timeout: 4000, data: also ? { also } : undefined });
    return;
  }
  const run = async () => {
    toasts.close(id);
    const result = await act(undo);
    if (!result.ok) return announceError(`Couldn't undo that. ${result.error}`);
    await after();
    toasts.add({ title: "Undone.", timeout: 2500, priority: "low" });
  };
  const id = toasts.add({
    title: message,
    timeout: 8000,
    actionProps: { children: "Undo", onClick: () => void run() },
    data: also ? { also } : undefined,
    onClose: () => {
      if (latestUndo?.id === id) latestUndo = null;
    },
  });
  latestUndo = { id, run: () => void run() };
}

// A failure that has no dialog of its own to show in. High priority, so a
// screen reader hears it straight away.
export function announceError(message: string, retry?: () => void) {
  toasts.add({
    title: message,
    type: "error",
    priority: "high",
    timeout: 10000,
    actionProps: retry ? { children: "Try again", onClick: retry } : undefined,
  });
}

export function Toaster() {
  // ⌘Z / Ctrl+Z takes back the latest change, unless a text field wants it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!latestUndo || e.key.toLowerCase() !== "z" || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      latestUndo.run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <Toast.Provider toastManager={toasts} limit={3}>
      <Toast.Portal>
        {/* --bottom-bar: the board's phone inbox bar, which notices sit above. */}
        <Toast.Viewport className="fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--bottom-bar,0px))] z-50 mx-auto w-[calc(100vw-2rem)] max-w-md md:bottom-[max(1rem,env(safe-area-inset-bottom))]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

// A notice's buttons: Undo, Try again, and what a change offers beside them. Mist pills,
// as on the Subscriptions card, since a notice is the same white card.
const ACTION = cn(
  "h-8 shrink-0 rounded-full bg-mist px-3.5 text-sm font-medium hover:bg-mist-hover pointer-coarse:h-11 pointer-coarse:px-4 dark:bg-mist-night dark:hover:bg-card-night-hover",
  FOCUS
);

function ToastList() {
  const { toasts: list } = Toast.useToastManager();
  return list.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        // Stacked like sheets, newest in front; fanned out on hover or focus.
        "[--gap:0.5rem] [--peek:0.5rem] [--scale:calc(max(0,1-(var(--toast-index)*0.06)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
        // Dressed as the board's menus: a white card with a hairline of Ink, and no shadow.
        "absolute inset-x-0 bottom-0 z-[calc(1000-var(--toast-index))] h-[var(--height)] origin-bottom select-none rounded-2xl bg-white text-ink ring-1 ring-ink/10 dark:bg-card-night dark:text-chalk dark:ring-white/10",
        "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
        "data-expanded:h-[var(--toast-height)] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-starting-style:[transform:translateY(120%)] data-ending-style:opacity-0 data-limited:opacity-0 [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(120%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+120%))] data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-120%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+120%))_translateY(var(--offset-y))]",
        "[transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.3s,height_0.15s] motion-reduce:[transition:opacity_0.2s]",
        "after:absolute after:left-0 after:top-full after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        FOCUS
      )}
    >
      {/* The buttons share the words' line while the words keep 12rem, and drop under
          them, to the right, when they don't: two lines on a phone, never four. */}
      <Toast.Content className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 overflow-hidden py-2 pl-3.5 pr-2 transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100">
        <div className="flex min-w-48 flex-1 items-center gap-2.5">
          {toast.type === "error" && <CircleAlertIcon aria-hidden className="size-4 shrink-0 text-destructive" />}
          <Toast.Title className="min-w-0 flex-1 text-[15px] leading-snug" />
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {toast.data?.also && (
            <button
              type="button"
              onClick={() => {
                toasts.close(toast.id);
                toast.data.also.onClick();
              }}
              className={ACTION}
            >
              {toast.data.also.label}
            </button>
          )}
          {toast.actionProps && <Toast.Action className={ACTION} />}
          <Toast.Close
            aria-label="Dismiss"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-mist hover:text-ink pointer-coarse:size-11 dark:hover:bg-card-night-hover dark:hover:text-chalk",
              MUTED,
              FOCUS
            )}
          >
            <XIcon className="size-4" />
          </Toast.Close>
        </div>
      </Toast.Content>
    </Toast.Root>
  ));
}
