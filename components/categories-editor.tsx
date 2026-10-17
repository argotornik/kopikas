"use client";

import { useEffect, useRef, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVerticalIcon } from "lucide-react";
import { FIXED_CATEGORIES, SAVINGS, SUBSCRIPTIONS } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// What the Categories dialog can ask the server to do.
export type CategoryAction =
  | { type: "category-add"; name: string }
  | { type: "category-rename"; from: string; to: string }
  | { type: "category-order"; order: string[] }
  | { type: "category-budget"; name: string; budget: number | null };

// The list behind the Categories card. Each row saves on blur or Enter, so
// there is nothing to batch and a failed rename shows up right away.
export function CategoriesEditor({
  open,
  categories,
  onClose,
  onAction,
  className,
}: {
  open: boolean;
  categories: { name: string; budget: number | null }[];
  onClose: () => void;
  onAction: (action: CategoryAction) => Promise<string | null>; // null = saved, otherwise the reason it was not
  className?: string; // a page's own look for the dialog
}) {
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState("");
  const run = async (action: CategoryAction) => {
    const e = await onAction(action);
    setErr(e ?? "");
    return !e;
  };
  // The order on screen. Follows the server list, except for the moment
  // between a drop and the refetch, when it already shows the new order.
  const names = categories.map((c) => c.name);
  const [order, setOrder] = useState(names);
  useEffect(() => setOrder(categories.map((c) => c.name)), [categories]);
  const budgetOf = (name: string) => categories.find((c) => c.name === name)?.budget ?? null;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = async (e: DragEndEvent) => {
    const from = order.indexOf(String(e.active.id));
    const to = e.over ? order.indexOf(String(e.over.id)) : -1;
    if (from < 0 || to < 0 || from === to) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    if (!(await run({ type: "category-order", order: next }))) setOrder(names);
  };
  const addNew = async () => {
    const name = newName.trim();
    if (name && (await run({ type: "category-add", name }))) setNewName("");
  };
  // A new row lands at the bottom of a list that scrolls: bring it into view.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [categories.length]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("sm:max-w-sm", className)}>
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            Rename in place; everything filed under the old name follows. The right field is a monthly limit, empty
            for none.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {/* Column heads for the two fields every row has; each field keeps its own name too. */}
          <div aria-hidden className="flex gap-1.5 pl-8 pr-0.5 text-xs font-medium text-muted-foreground pointer-coarse:pl-12">
            <span className="flex-1">Name</span>
            <span className="w-24 text-right">Monthly limit</span>
          </div>
          <div ref={listRef} className="grid max-h-[55vh] gap-1.5 overflow-y-auto pr-0.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                {order.map((c) => (
                  <SortableRow key={c} id={c}>
                    <div className="flex gap-1.5">
                      {FIXED_CATEGORIES.includes(c) ? (
                        <Input value={c} disabled aria-label={`${c} (keeps its name)`} title="Wired into the board — keeps its name" />
                      ) : (
                        <NameField value={c} onCommit={(to) => run({ type: "category-rename", from: c, to })} />
                      )}
                      {c !== SAVINGS && (
                        <BudgetField
                          name={c}
                          value={budgetOf(c)}
                          onCommit={(budget) => run({ type: "category-budget", name: c, budget })}
                        />
                      )}
                    </div>
                  </SortableRow>
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="mt-1 flex gap-2">
            <Input
              placeholder="New category"
              aria-label="New category"
              name="new-category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addNew();
                }
              }}
            />
            <Button variant="outline" disabled={!newName.trim()} onClick={() => void addNew()}>
              Add
            </Button>
          </div>
          <p className={cn("min-h-4 text-xs", err ? "text-destructive" : "text-muted-foreground")}>
            {err || `${SAVINGS} and ${SUBSCRIPTIONS} are wired into the board and keep their names.`}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A row of the list with a grip to drag it by. Only the grip starts a drag,
// so the text field beside it still selects and edits normally.
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined, transition }}
      className={cn("flex items-center gap-1", isDragging && "relative z-10")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${id}`}
        title="Drag to reorder"
        className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-foreground active:cursor-grabbing pointer-coarse:size-11"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// One editable category name. Commits on blur or Enter when changed; a
// refused rename puts the saved name back, and so does Escape (which also
// closes the dialog, so the blur that follows must see the reset — hence the ref).
function NameField({ value, onCommit }: { value: string; onCommit: (to: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  const latest = useRef(value);
  const set = (v: string) => {
    latest.current = v;
    setDraft(v);
  };
  useEffect(() => set(value), [value]);
  return (
    <Input
      aria-label={`Rename ${value}`}
      value={draft}
      onChange={(e) => set(e.target.value)}
      onBlur={async () => {
        const to = latest.current.trim();
        if (to && to !== value && (await onCommit(to))) return;
        set(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") set(value);
      }}
    />
  );
}

// One category's monthly limit, or none. Commits on blur or Enter; an empty
// field removes the limit. Same ref trick as NameField, for the same reason.
function BudgetField({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: number | null;
  onCommit: (budget: number | null) => Promise<boolean>;
}) {
  const text = value == null ? "" : String(value);
  const [draft, setDraft] = useState(text);
  const latest = useRef(text);
  const set = (v: string) => {
    latest.current = v;
    setDraft(v);
  };
  useEffect(() => set(text), [text]);
  return (
    <Input
      aria-label={`Monthly limit for ${name}, in euros`}
      placeholder="none"
      inputMode="decimal"
      className="w-24 shrink-0 text-right font-mono tabular-nums"
      value={draft}
      onChange={(e) => set(e.target.value)}
      onBlur={async () => {
        const raw = latest.current.replace(/[\s€]/g, "").replace(",", ".");
        const budget = raw === "" ? null : Number(raw);
        if (budget !== null && !(budget > 0)) return set(text);
        if (budget === value) return;
        if (!(await onCommit(budget))) set(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") set(text);
      }}
    />
  );
}
