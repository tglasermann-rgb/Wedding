import { describe, expect, it } from "vitest";
import { seatPositions, tableSize } from "@/lib/seating/geometry";
import { firstFreeSeat, validateSeating } from "@/lib/seating/validate";

describe("geometry", () => {
  it.each([["round", 8], ["round", 10], ["round", 12], ["square", 8], ["square", 5], ["rect", 10], ["rect", 4], ["rect", 20]] as const)(
    "%s table with %i seats has that many distinct seats",
    (shape, cap) => {
      const pts = seatPositions(shape, cap);
      expect(pts).toHaveLength(cap);
      expect(new Set(pts.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`)).size).toBe(cap);
    },
  );
  it("bigger round tables are bigger", () => {
    expect(tableSize("round", 12).width).toBeGreaterThan(tableSize("round", 8).width);
  });
  it("seats sit outside the table top", () => {
    const { radius } = tableSize("round", 10);
    for (const p of seatPositions("round", 10)) expect(Math.hypot(p.x, p.y)).toBeGreaterThan(radius!);
  });
});

describe("validateSeating", () => {
  const base = {
    tables: [{ id: "t1", capacity: 2 }, { id: "t2", capacity: 8 }],
    guestHousehold: { a: "h1", b: "h1", c: "h2", d: "h3" } as Record<string, string>,
    constraints: [] as { id: string; kind: "together" | "apart"; guest_a: string; guest_b: string }[],
  };
  it("detects over capacity and split households", () => {
    const w = validateSeating({ ...base, assignments: [
      { guest_id: "a", table_id: "t1" }, { guest_id: "c", table_id: "t1" }, { guest_id: "d", table_id: "t1" }, { guest_id: "b", table_id: "t2" },
    ] });
    expect(w).toContainEqual({ kind: "over_capacity", tableId: "t1", seated: 3, capacity: 2 });
    expect(w).toContainEqual({ kind: "household_split", householdId: "h1", tableIds: ["t1", "t2"] });
  });
  it("checks together/apart constraints", () => {
    const w = validateSeating({
      ...base,
      constraints: [{ id: "k1", kind: "apart", guest_a: "c", guest_b: "d" }, { id: "k2", kind: "together", guest_a: "a", guest_b: "c" }],
      assignments: [{ guest_id: "c", table_id: "t2" }, { guest_id: "d", table_id: "t2" }, { guest_id: "a", table_id: "t1" }],
    });
    expect(w.map((x) => x.kind).sort()).toEqual(["apart_violated", "together_violated"]);
  });
  it("finds the first free seat", () => {
    expect(firstFreeSeat(4, [0, 2, null])).toBe(1);
    expect(firstFreeSeat(2, [0, 1])).toBeNull();
  });
});
