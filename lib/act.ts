// The one way the pages ask the server for a change. Whatever goes wrong on
// the way — no network, an expired sign-in, a refusal, a crash — comes back
// as a sentence a person can act on, never as silence.

export type Undo = { type: string } & Record<string, unknown>;
// `fresh` is the view the caller asked for, as it stands after the change.
export type ActResult<V = unknown> = { ok: true; undo?: Undo; fresh?: V } | { ok: false; error: string };

// `view` asks the server to send that page's data back with the reply, so
// the page needs no second request to catch up.
export async function act<V = unknown>(action: object, view?: "board" | "shared"): Promise<ActResult<V>> {
  let res: Response;
  try {
    res = await fetch(view ? `/api/action?view=${view}` : "/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Kopikas. Check the connection and try again." };
  }
  const body = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string; undo?: Undo; board?: V; shared?: V }
    | null;
  if (res.ok && body?.ok !== false) return { ok: true, undo: body?.undo, fresh: body?.board ?? body?.shared };
  if (res.status === 401) return { ok: false, error: "Your sign-in has expired. Reload the page and sign in again." };
  if (body?.error) return { ok: false, error: sentence(body.error) };
  return {
    ok: false,
    error: res.status >= 500 ? "Something went wrong on the server. Try again in a moment." : "That didn't save. Try again.",
  };
}

// Server reasons are short phrases ("unknown tx"); shown as sentences.
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? "" : ".");

// A removed row takes its focused button with it, and focus would fall to the
// page. Called before the removal: returns what should take focus after it —
// the same control on the next row (or the previous, for the last), else the
// list itself. Rows carry data-row, controls data-focus-key, lists data-list.
export function focusAfterRemoval(control: HTMLElement | null): () => void {
  const row = control?.closest<HTMLElement>("[data-row]");
  const list = row?.closest<HTMLElement>("[data-list]");
  if (!control || !row || !list) return () => {};
  const key = control.dataset.focusKey;
  const rows = [...list.querySelectorAll<HTMLElement>("[data-row]")];
  const i = rows.indexOf(row);
  const neighbour = rows[i + 1] ?? rows[i - 1];
  const target = (key && neighbour?.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)) || list;
  // A frame later, so the re-render that removed the row has landed.
  return () =>
    requestAnimationFrame(() => {
      // Only when focus really was lost: a mouse user who moved on keeps their place.
      if (document.activeElement && document.activeElement !== document.body) return;
      if (target === list && !list.hasAttribute("tabindex")) list.tabIndex = -1;
      target.focus();
    });
}
