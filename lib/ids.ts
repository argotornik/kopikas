// An id for a new record: a prefix saying what it is, then time and chance, so ids made on the
// server and in the demo's browser never collide within one household's data.
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
