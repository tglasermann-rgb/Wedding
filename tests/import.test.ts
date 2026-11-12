import { describe, expect, it } from "vitest";
import { groupHouseholds, mapImportRows, normalizePhone } from "@/lib/guests/import";

describe("import", () => {
  it("normalizes phones to E.164", () => {
    expect(normalizePhone("(415) 555-2671")).toBe("+14155552671");
    expect(normalizePhone("55 1234 5678", "MX")).toBe("+525512345678");
    expect(normalizePhone("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizePhone("123")).toBeNull();
  });
  it("maps spanish headers and groups households", () => {
    const { rows, errors } = mapImportRows([
      { Familia: "Pérez", Nombre: "Juan", Apellido: "Pérez", Correo: "JUAN@x.com", Teléfono: "5512345678", Etiquetas: "familia, novia" },
      { Familia: "pérez", Nombre: "Lucía", Niño: "sí" },
      { Nombre: "Sola", Teléfono: "abc" },
      { Nombre: "", Correo: "" },
    ], "MX");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ email: "juan@x.com", phone: "+525512345678", tags: ["familia", "novia"] });
    expect(rows[1].is_child).toBe(true);
    expect(errors).toEqual([{ line: 4, message: "Invalid phone number: abc" }]);
    const hh = groupHouseholds(rows);
    expect(hh.map((h) => [h.name, h.guests.length])).toEqual([["Pérez", 2], ["Sola", 1]]);
  });
  it("maps english headers", () => {
    const { rows, errors } = mapImportRows([
      { Household: "The Smiths", "First Name": "John", "Last Name": "Smith", Email: "JOHN@x.com", "Phone Number": "+1 415 555 2671", Tags: "college; bride", "Plus Ones": "1" },
      { Household: "the smiths", "First Name": "Lily", Child: "yes" },
      { "First Name": "Ann", Email: "nope" },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ last_name: "Smith", email: "john@x.com", phone: "+14155552671", tags: ["college", "bride"], plus_ones: 1 });
    expect(rows[1].is_child).toBe(true);
    expect(rows[2]).toMatchObject({ household: "Ann", email: null });
    expect(errors).toEqual([{ line: 4, message: "Invalid email: nope" }]);
    expect(groupHouseholds(rows).map((h) => [h.name, h.guests.length])).toEqual([["The Smiths", 2], ["Ann", 1]]);
  });
});
