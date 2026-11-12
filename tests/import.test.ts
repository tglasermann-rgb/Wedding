import { describe, expect, it } from "vitest";
import { groupHouseholds, mapImportRows, normalizePhone } from "@/lib/guests/import";

describe("import", () => {
  it("normalizes phones to E.164", () => {
    expect(normalizePhone("55 1234 5678")).toBe("+525512345678");
    expect(normalizePhone("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizePhone("123")).toBeNull();
  });
  it("maps spanish headers and groups households", () => {
    const { rows, errors } = mapImportRows([
      { Familia: "Pérez", Nombre: "Juan", Apellido: "Pérez", Correo: "JUAN@x.com", Teléfono: "5512345678", Etiquetas: "familia, novia" },
      { Familia: "pérez", Nombre: "Lucía", Niño: "sí" },
      { Nombre: "Sola", Teléfono: "abc" },
      { Nombre: "", Correo: "" },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ email: "juan@x.com", phone: "+525512345678", tags: ["familia", "novia"] });
    expect(rows[1].is_child).toBe(true);
    expect(errors).toEqual([{ line: 4, message: "Teléfono inválido: abc" }]);
    const hh = groupHouseholds(rows);
    expect(hh.map((h) => [h.name, h.guests.length])).toEqual([["Pérez", 2], ["Sola", 1]]);
  });
});
