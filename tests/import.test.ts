import { describe, expect, it } from "vitest";
import { groupHouseholds, mapImportRows, normalizePhone } from "@/lib/guests/import";

describe("import", () => {
  it("normalizes phones to E.164", () => {
    expect(normalizePhone("(415) 555-2671")).toBe("+14155552671");
    expect(normalizePhone("+52 55 1234 5678")).toBe("+525512345678");
    expect(normalizePhone("55 1234 5678", "MX")).toBe("+525512345678");
    expect(normalizePhone("123")).toBeNull();
  });
  it("maps headers and groups households", () => {
    const { rows, errors } = mapImportRows([
      { Household: "Smith", "First Name": "John", "Last Name": "Smith", Email: "JOHN@x.com", Phone: "(415) 555-2671", Tags: "family, bride" },
      { household: "smith", first_name: "Lucy", Child: "yes" },
      { Familia: "Solo", Nombre: "Ana", Teléfono: "abc" },
      { "First Name": "", Email: "" },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ email: "john@x.com", phone: "+14155552671", tags: ["family", "bride"] });
    expect(rows[1].is_child).toBe(true);
    expect(errors).toEqual([{ line: 4, message: "Invalid phone: abc" }]);
    const hh = groupHouseholds(rows);
    expect(hh.map((h) => [h.name, h.guests.length])).toEqual([["Smith", 2], ["Solo", 1]]);
  });
});
