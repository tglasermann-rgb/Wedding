"use client";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { SECTION_LABELS, type SectionType, type SiteSection } from "@/lib/site/schema";
import { THEMES } from "@/lib/site/themes";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveSite } from "./actions";

type State = { themeId: string; published: boolean; sections: SiteSection[] };

const NEW: Record<SectionType, () => SiteSection> = {
  hero: () => ({ id: crypto.randomUUID(), type: "hero", title: "", subtitle: "", imageUrl: "" }),
  countdown: () => ({ id: crypto.randomUUID(), type: "countdown" }),
  text: () => ({ id: crypto.randomUUID(), type: "text", title: "Nueva sección", body: "" }),
  schedule: () => ({ id: crypto.randomUUID(), type: "schedule", title: "Programa" }),
  gifts: () => ({ id: crypto.randomUUID(), type: "gifts", title: "Mesa de regalos", text: "", links: [] }),
  gallery: () => ({ id: crypto.randomUUID(), type: "gallery", title: "Galería", images: [] }),
  faq: () => ({ id: crypto.randomUUID(), type: "faq", title: "Preguntas frecuentes", items: [] }),
  rsvp: () => ({ id: crypto.randomUUID(), type: "rsvp", title: "Confirma tu asistencia", text: "" }),
};

export function SiteEditor({ eventId, slug, canEdit, initial }: { eventId: string; slug: string; canEdit: boolean; initial: State }) {
  const [s, setS] = useState<State>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [addType, setAddType] = useState<SectionType>("text");

  const update = (fn: (s: State) => State) => { setS(fn); setDirty(true); setMsg(null); };
  const patch = (i: number, p: Partial<SiteSection>) => update((st) => ({ ...st, sections: st.sections.map((x, j) => (j === i ? ({ ...x, ...p } as SiteSection) : x)) }));
  const move = (i: number, d: number) => update((st) => {
    const a = [...st.sections]; const j = i + d;
    if (j < 0 || j >= a.length) return st;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...st, sections: a };
  });

  async function upload(file: File): Promise<string | null> {
    const sb = createClient();
    const path = `${eventId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await sb.storage.from("event-assets").upload(path, file, { upsert: false });
    if (error) { alert(error.message); return null; }
    return sb.storage.from("event-assets").getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="space-y-4">
      <Card title="Página del evento" actions={
        <div className="flex items-center gap-3">
          <a href={`/${slug}?preview=1`} target="_blank" className="text-sm underline">Vista previa ↗</a>
          {canEdit && <Button disabled={pending || !dirty} onClick={() => start(async () => { try { await saveSite(eventId, s); setDirty(false); setMsg("Guardado."); } catch (e) { setMsg((e as Error).message); } })}>{pending ? "Guardando…" : "Guardar"}</Button>}
        </div>
      }>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Tema">
            <Select value={s.themeId} onChange={(e) => update((st) => ({ ...st, themeId: e.target.value }))}>
              {Object.values(THEMES).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={s.published} onChange={(e) => update((st) => ({ ...st, published: e.target.checked }))} /> Publicada (visible para invitados)</label>
          {msg && <span className="pb-2 text-sm text-emerald-700">{msg}</span>}
        </div>
      </Card>

      {s.sections.map((sec, i) => (
        <Card key={sec.id} title={<span>{SECTION_LABELS[sec.type]} {sec.hidden && <span className="text-xs text-stone-400">(oculta)</span>}</span>} actions={canEdit && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
            <Button size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
            <Button size="sm" variant="ghost" onClick={() => patch(i, { hidden: !sec.hidden })}>{sec.hidden ? "Mostrar" : "Ocultar"}</Button>
            <Button size="sm" variant="danger" onClick={() => update((st) => ({ ...st, sections: st.sections.filter((_, j) => j !== i) }))}>✕</Button>
          </div>
        )}>
          <fieldset disabled={!canEdit} className="space-y-3">
            {"title" in sec && <Field label="Título"><Input value={sec.title} onChange={(e) => patch(i, { title: e.target.value })} /></Field>}
            {sec.type === "hero" && (
              <>
                <Field label="Subtítulo"><Input value={sec.subtitle} onChange={(e) => patch(i, { subtitle: e.target.value })} /></Field>
                <Field label="Foto de portada">
                  <div className="flex items-center gap-3">
                    {sec.imageUrl && <img src={sec.imageUrl} alt="" className="h-16 w-24 rounded object-cover" />}
                    <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const u = await upload(f); if (u) patch(i, { imageUrl: u }); } }} />
                  </div>
                </Field>
              </>
            )}
            {sec.type === "text" && <Field label="Texto"><Textarea rows={5} value={sec.body} onChange={(e) => patch(i, { body: e.target.value })} /></Field>}
            {(sec.type === "rsvp" || sec.type === "gifts") && <Field label="Texto"><Textarea value={sec.text} onChange={(e) => patch(i, { text: e.target.value })} /></Field>}
            {sec.type === "schedule" && <p className="text-sm text-stone-500">Muestra los eventos (ceremonia, recepción…) configurados en Ajustes, con hora, lugar y mapa.</p>}
            {sec.type === "countdown" && <p className="text-sm text-stone-500">Cuenta regresiva hasta la fecha del evento.</p>}
            {sec.type === "gifts" && (
              <ListEditor items={sec.links} empty={{ label: "", url: "" }} onChange={(links) => patch(i, { links })}
                render={(it, set) => (<><Input placeholder="Nombre (Liverpool, Amazon…)" value={it.label} onChange={(e) => set({ ...it, label: e.target.value })} /><Input placeholder="https://…" value={it.url} onChange={(e) => set({ ...it, url: e.target.value })} /></>)} />
            )}
            {sec.type === "faq" && (
              <ListEditor items={sec.items} empty={{ q: "", a: "" }} onChange={(items) => patch(i, { items })}
                render={(it, set) => (<><Input placeholder="Pregunta" value={it.q} onChange={(e) => set({ ...it, q: e.target.value })} /><Input placeholder="Respuesta" value={it.a} onChange={(e) => set({ ...it, a: e.target.value })} /></>)} />
            )}
            {sec.type === "gallery" && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {sec.images.map((u, k) => (
                    <div key={u} className="relative">
                      <img src={u} alt="" className="h-20 w-28 rounded object-cover" />
                      <button type="button" className="absolute right-1 top-1 rounded bg-white/80 px-1 text-xs" onClick={() => patch(i, { images: sec.images.filter((_, j) => j !== k) })}>✕</button>
                    </div>
                  ))}
                </div>
                <input className="mt-2" type="file" accept="image/*" multiple onChange={async (e) => {
                  const urls: string[] = [];
                  for (const f of Array.from(e.target.files ?? [])) { const u = await upload(f); if (u) urls.push(u); }
                  patch(i, { images: [...sec.images, ...urls] });
                }} />
              </div>
            )}
          </fieldset>
        </Card>
      ))}

      {canEdit && (
        <div className="flex items-center gap-2">
          <Select value={addType} onChange={(e) => setAddType(e.target.value as SectionType)} className="w-56">
            {Object.entries(SECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Button variant="secondary" onClick={() => update((st) => ({ ...st, sections: [...st.sections, NEW[addType]()] }))}>+ Agregar sección</Button>
        </div>
      )}
    </div>
  );
}

function ListEditor<T>({ items, empty, onChange, render }: { items: T[]; empty: T; onChange: (v: T[]) => void; render: (it: T, set: (v: T) => void) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {items.map((it, k) => (
        <div key={k} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          {render(it, (v) => onChange(items.map((x, j) => (j === k ? v : x))))}
          <Button type="button" size="sm" variant="danger" onClick={() => onChange(items.filter((_, j) => j !== k))}>✕</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, empty])}>+ Agregar</Button>
    </div>
  );
}
