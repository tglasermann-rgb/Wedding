export type TemplateVars = Record<string, string | number | null | undefined>;

/** Replace {{var}} placeholders. Unknown vars render as empty string. */
export function renderTemplate(tpl: string, vars: TemplateVars): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/** Ordered list of variables used in a template (deduplicated). Useful for WhatsApp body params. */
export function templateVariables(tpl: string): string[] {
  const out: string[] = [];
  for (const m of tpl.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

export const AVAILABLE_VARS = [
  "first_name", "last_name", "household", "event_title", "hosts", "event_date", "rsvp_link", "site_link",
] as const;
