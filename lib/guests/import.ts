import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function normalizePhone(raw: string | null | undefined, defaultCountry: CountryCode = "MX"): string | null {
  if (!raw) return null;
  const p = parsePhoneNumberFromString(String(raw).trim(), defaultCountry);
  return p?.isValid() ? p.number : null;
}

export interface ImportRow {
  household: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  side?: string | null;
  tags: string[];
  is_child: boolean;
  plus_ones: number;
}

const ALIASES: Record<keyof Omit<ImportRow, "tags"> | "tags", string[]> = {
  household: ["household", "familia", "invitacion", "invitación", "grupo", "family"],
  first_name: ["first_name", "nombre", "name", "first name"],
  last_name: ["last_name", "apellido", "apellidos", "last name"],
  email: ["email", "correo", "e-mail", "mail"],
  phone: ["phone", "telefono", "teléfono", "celular", "whatsapp", "movil", "móvil"],
  side: ["side", "lado", "de parte de"],
  tags: ["tags", "etiquetas", "grupo2", "categoria", "categoría"],
  is_child: ["is_child", "niño", "nino", "child", "menor"],
  plus_ones: ["plus_ones", "acompañantes", "acompanantes", "+1"],
};

const norm = (s: string) => s.trim().toLowerCase();
const truthy = (v: unknown) => ["1", "si", "sí", "yes", "true", "x"].includes(norm(String(v ?? "")));

export interface ImportResult { rows: ImportRow[]; errors: { line: number; message: string }[] }

/** Map spreadsheet rows (header -> value) to import rows. Rows without household use "Nombre Apellido". */
export function mapImportRows(records: Record<string, unknown>[], defaultCountry: CountryCode = "MX"): ImportResult {
  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  records.forEach((rec, i) => {
    const get = (k: keyof typeof ALIASES) => {
      for (const [h, v] of Object.entries(rec)) if (ALIASES[k].includes(norm(h))) return v == null ? "" : String(v).trim();
      return "";
    };
    const first = get("first_name");
    if (!first) { if (Object.values(rec).some((v) => String(v ?? "").trim())) errors.push({ line: i + 2, message: "Falta el nombre" }); return; }
    const phoneRaw = get("phone");
    const phone = normalizePhone(phoneRaw, defaultCountry);
    if (phoneRaw && !phone) errors.push({ line: i + 2, message: `Teléfono inválido: ${phoneRaw}` });
    const email = get("email").toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push({ line: i + 2, message: `Email inválido: ${email}` });
    const last = get("last_name");
    rows.push({
      household: get("household") || `${first} ${last}`.trim(),
      first_name: first,
      last_name: last || null,
      email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
      phone,
      side: get("side") || null,
      tags: get("tags").split(/[,;|]/).map((t) => t.trim()).filter(Boolean),
      is_child: truthy(get("is_child")),
      plus_ones: Number.parseInt(get("plus_ones") || "0", 10) || 0,
    });
  });
  return { rows, errors };
}

/** Group rows into households, preserving order. */
export function groupHouseholds(rows: ImportRow[]) {
  const map = new Map<string, { name: string; side: string | null; tags: string[]; plus_ones: number; guests: ImportRow[] }>();
  for (const r of rows) {
    const key = norm(r.household);
    if (!map.has(key)) map.set(key, { name: r.household, side: r.side ?? null, tags: [], plus_ones: 0, guests: [] });
    const h = map.get(key)!;
    h.guests.push(r);
    h.tags = [...new Set([...h.tags, ...r.tags])];
    h.plus_ones = Math.max(h.plus_ones, r.plus_ones);
    h.side ??= r.side ?? null;
  }
  return [...map.values()];
}
