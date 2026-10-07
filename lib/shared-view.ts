import type { Db, Person } from "./types";
import { buildBoard } from "./board";

// What Pooleks shows, for both of them: the balance, every shared item,
// every repayment, the category names — never the full feed. One builder
// for the page's first render, /api/shared, and an action's reply.
export function sharedView(db: Db, role: Person) {
  const board = buildBoard(db);
  return {
    role,
    balance: board.balance,
    sharedItems: board.sharedItems,
    settlements: board.settlements,
    categories: db.categories.map((c) => c.name),
  };
}
