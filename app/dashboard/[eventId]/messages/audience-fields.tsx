import type { SessionRow } from "@/lib/types";
import { RSVP_LABELS } from "@/lib/rsvp/logic";
import { Field, Input, Select } from "@/components/ui";

export function AudienceFields({ sessions, defaultRsvp = [] }: { sessions: SessionRow[]; defaultRsvp?: string[] }) {
  return (
    <fieldset className="space-y-3 rounded-lg bg-stone-50 p-3">
      <legend className="px-1 text-xs font-medium text-stone-600">¿A quién?</legend>
      <div className="flex flex-wrap gap-3 text-sm">
        {(["pending", "maybe", "yes", "no"] as const).map((s) => (
          <label key={s} className="flex items-center gap-1">
            <input type="checkbox" name="rsvp" value={s} defaultChecked={defaultRsvp.includes(s)} /> {RSVP_LABELS[s]}
          </label>
        ))}
        <span className="text-xs text-stone-400">(ninguno = todos)</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Respuesta para">
          <Select name="sessionId"><option value="">Cualquier evento</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </Field>
        <Field label="Etiquetas"><Input name="tags" placeholder="familia, trabajo" /></Field>
        <Field label="De parte de"><Input name="side" placeholder="novia" /></Field>
      </div>
      <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="includeChildren" defaultChecked /> Incluir niños</label>
    </fieldset>
  );
}
