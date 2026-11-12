import type { SeatAssignmentRow, SeatingConstraintRow, SeatingTableRow } from "../types";

export type SeatingWarning =
  | { kind: "over_capacity"; tableId: string; seated: number; capacity: number }
  | { kind: "household_split"; householdId: string; tableIds: string[] }
  | { kind: "together_violated"; constraintId: string }
  | { kind: "apart_violated"; constraintId: string; tableId: string };

export interface SeatingInput {
  tables: Pick<SeatingTableRow, "id" | "capacity">[];
  assignments: Pick<SeatAssignmentRow, "guest_id" | "table_id">[];
  constraints: Pick<SeatingConstraintRow, "id" | "kind" | "guest_a" | "guest_b">[];
  guestHousehold: Record<string, string>; // guest_id -> household_id
}

export function validateSeating(input: SeatingInput): SeatingWarning[] {
  const warnings: SeatingWarning[] = [];
  const tableOf = new Map(input.assignments.map((a) => [a.guest_id, a.table_id]));

  const counts = new Map<string, number>();
  for (const a of input.assignments) counts.set(a.table_id, (counts.get(a.table_id) ?? 0) + 1);
  for (const t of input.tables) {
    const seated = counts.get(t.id) ?? 0;
    if (seated > t.capacity) warnings.push({ kind: "over_capacity", tableId: t.id, seated, capacity: t.capacity });
  }

  const byHousehold = new Map<string, Set<string>>();
  for (const a of input.assignments) {
    const h = input.guestHousehold[a.guest_id];
    if (!h) continue;
    if (!byHousehold.has(h)) byHousehold.set(h, new Set());
    byHousehold.get(h)!.add(a.table_id);
  }
  for (const [householdId, set] of byHousehold)
    if (set.size > 1) warnings.push({ kind: "household_split", householdId, tableIds: [...set].sort() });

  for (const c of input.constraints) {
    const ta = tableOf.get(c.guest_a), tb = tableOf.get(c.guest_b);
    if (!ta || !tb) continue; // only evaluate once both are seated
    if (c.kind === "together" && ta !== tb) warnings.push({ kind: "together_violated", constraintId: c.id });
    if (c.kind === "apart" && ta === tb) warnings.push({ kind: "apart_violated", constraintId: c.id, tableId: ta });
  }
  return warnings;
}

/** First free seat index at a table, or null when full. */
export function firstFreeSeat(capacity: number, taken: (number | null)[]): number | null {
  const used = new Set(taken.filter((n): n is number => n !== null));
  for (let i = 0; i < capacity; i++) if (!used.has(i)) return i;
  return null;
}
