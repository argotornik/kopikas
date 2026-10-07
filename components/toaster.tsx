"use client";

import { useEffect } from "react";
import { Toast } from "@base-ui/react/toast";
import { CircleAlertIcon, XIcon } from "lucide-react";
import { act, type Undo } from "@/lib/act";
import { cn } from "@/lib/utils";

// One notice area for every page, at the foot of the screen like the last
// line of a statement. Base UI makes it a landmark (F6 jumps in) and a live
// region, so what it says is announced without stealing focus.
export const toasts = Toast.createToastManager();

// The most recent change that can still be taken back, for ⌘Z / Ctrl+Z.
let latestUndo: { id: string; run: () => void } | null = null;

// After a change that can be taken back: say what happened and offer Undo
// for a while. `after` brings the page up to date once the undo has landed.
export function announceUndoable(message: string, undo: Undo | undefined, after: () => unknown) {
  if (!undo) {
    toasts.add({ title: message, timeout: 4000 });
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
        <Toast.Viewport className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100vw-2rem)] max-w-sm">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts: list } = Toast.useToastManager();
  return list.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        // Stacked like sheets, newest in front; fanned out on hover or focus.
        "[--gap:0.5rem] [--peek:0.5rem] [--scale:calc(max(0,1-(var(--toast-index)*0.06)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
        "absolute inset-x-0 bottom-0 z-[calc(1000-var(--toast-index))] h-[var(--height)] origin-bottom select-none rounded-xl bg-popover text-popover-foreground shadow-[0_6px_24px_-6px_rgb(0_0_0/0.25)] ring-1 ring-foreground/10",
        "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
        "data-expanded:h-[var(--toast-height)] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-starting-style:[transform:translateY(120%)] data-ending-style:opacity-0 data-limited:opacity-0 [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(120%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+120%))] data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-120%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+120%))_translateY(var(--offset-y))]",
        "[transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.3s,height_0.15s] motion-reduce:[transition:opacity_0.2s]",
        "after:absolute after:left-0 after:top-full after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <Toast.Content className="flex items-center gap-2.5 overflow-hidden py-2 pl-3.5 pr-2 transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100">
        {toast.type === "error" && <CircleAlertIcon aria-hidden className="size-4 shrink-0 text-destructive" />}
        <Toast.Title className="min-w-0 flex-1 text-sm leading-snug" />
        {toast.actionProps && <Toast.Action className="h-8 shrink-0 rounded-lg px-2.5 text-sm font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
        <Toast.Close
          aria-label="Dismiss"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-4" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
