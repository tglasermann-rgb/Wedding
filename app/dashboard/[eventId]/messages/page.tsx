import { requireEvent } from "@/lib/auth";
import { loadSessions } from "@/lib/data";
import { env } from "@/lib/env";
import { AVAILABLE_VARS } from "@/lib/messaging/render-template";
import { STATUS_LABELS } from "@/lib/messaging/status";
import type { MessageStatus, TemplateRow } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import { AudienceFields } from "./audience-fields";
import { cancelCampaign, createAutomation, createCampaign, deleteTemplate, retryFailed, saveTemplate, toggleAutomation } from "./actions";

export default async function MessagesPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ status?: string; channel?: string }> }) {
  const { eventId } = await params;
  const filter = await searchParams;
  const { supabase, canEdit } = await requireEvent(eventId);
  let mq = supabase.from("messages")
    .select("id,channel,to_address,status,error,queued_at,sent_at,delivered_at,opened_at,clicked_at,replied_at,guest:guests(first_name,last_name),campaign:campaigns(name),automation:automations(name)")
    .eq("event_id", eventId).order("queued_at", { ascending: false }).limit(300);
  if (filter.status) mq = mq.eq("status", filter.status);
  if (filter.channel) mq = mq.eq("channel", filter.channel);
  const [sessions, { data: templates }, { data: campaigns }, { data: automations }, { data: messages }] = await Promise.all([
    loadSessions(supabase, eventId),
    supabase.from("message_templates").select("*").eq("event_id", eventId).order("created_at"),
    supabase.from("campaigns").select("*, template:message_templates(name,channel)").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("automations").select("*, template:message_templates(name,channel)").eq("event_id", eventId).order("days_before", { ascending: false }),
    mq,
  ]);
  const tpls = (templates ?? []) as TemplateRow[];
  const providers = { email: env.sender() ? "Sender" : "modo prueba (consola)", whatsapp: env.whatsapp() ? "Cloud API" : "no configurado" };
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "");

  return (
    <div className="space-y-6">
      <p className="text-xs text-stone-500">Email: {providers.email} · WhatsApp: {providers.whatsapp}</p>

      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Enviar o programar">
            {tpls.length === 0 ? <Empty>Crea una plantilla primero.</Empty> : (
              <ActionForm action={createCampaign.bind(null, eventId)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Plantilla">
                    <Select name="templateId" required>{tpls.map((t) => <option key={t.id} value={t.id}>{t.channel === "email" ? "✉" : "WA"} · {t.name}</option>)}</Select>
                  </Field>
                  <Field label="Nombre del envío"><Input name="name" placeholder="Invitación inicial" /></Field>
                </div>
                <AudienceFields sessions={sessions} />
                <Field label="Programar (opcional)" hint="Vacío = enviar ahora"><Input type="datetime-local" name="scheduled_at" /></Field>
                <SubmitButton pendingText="Enviando…">Enviar</SubmitButton>
              </ActionForm>
            )}
          </Card>

          <Card title="Recordatorios automáticos">
            <ul className="mb-4 space-y-2 text-sm">
              {(automations ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-2">
                  <span><b>{a.name}</b> — {a.days_before} días antes · {a.template?.name}{a.last_run_at && <span className="text-xs text-stone-500"> (ejecutado {fmt(a.last_run_at)})</span>}</span>
                  <form action={toggleAutomation.bind(null, eventId, a.id, !a.enabled)}>
                    <button className="text-xs underline">{a.enabled ? "Pausar" : "Activar"}</button>
                  </form>
                </li>
              ))}
            </ul>
            {tpls.length > 0 && (
              <ActionForm action={createAutomation.bind(null, eventId)} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Nombre"><Input name="name" defaultValue="Recordatorio" /></Field>
                  <Field label="Días antes"><Input name="days_before" type="number" min={0} defaultValue={30} /></Field>
                  <Field label="Plantilla"><Select name="templateId">{tpls.map((t) => <option key={t.id} value={t.id}>{t.channel === "email" ? "✉" : "WA"} · {t.name}</option>)}</Select></Field>
                </div>
                <AudienceFields sessions={sessions} defaultRsvp={["pending", "maybe"]} />
                <SubmitButton variant="secondary">Crear automatización</SubmitButton>
              </ActionForm>
            )}
          </Card>
        </div>
      )}

      <Card title="Plantillas">
        <div className="grid gap-4 lg:grid-cols-2">
          {tpls.map((t) => (
            <details key={t.id} className="rounded-lg border border-stone-200 p-3">
              <summary className="cursor-pointer text-sm"><Badge tone={t.channel === "email" ? "sent" : "replied"}>{t.channel === "email" ? "Email" : "WhatsApp"}</Badge> <b>{t.name}</b></summary>
              <TemplateForm eventId={eventId} t={t} canEdit={canEdit} />
            </details>
          ))}
          {canEdit && (
            <details className="rounded-lg border border-dashed border-stone-300 p-3">
              <summary className="cursor-pointer text-sm font-medium">+ Nueva plantilla</summary>
              <TemplateForm eventId={eventId} canEdit />
            </details>
          )}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Variables: {AVAILABLE_VARS.map((v) => `{{${v}}}`).join(" ")}. En WhatsApp, la plantilla aprobada en Meta debe tener {"{{1}}, {{2}}…"} en el mismo orden en que aparecen las variables aquí, y botones de respuesta rápida “Sí / No / Tal vez”.
        </p>
      </Card>

      {(campaigns ?? []).length > 0 && (
        <Card title="Envíos">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-100">
              {(campaigns ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5">{c.name}</td><td>{c.template?.name}</td>
                  <td>{c.scheduled_at ? fmt(c.scheduled_at) : fmt(c.created_at)}</td>
                  <td><Badge tone={c.status === "done" ? "sent" : c.status === "cancelled" ? "failed" : "queued"}>{c.status}</Badge></td>
                  <td className="text-right">{c.status === "scheduled" && canEdit && <form action={cancelCampaign.bind(null, eventId, c.id)}><button className="text-xs underline">Cancelar</button></form>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        title="Historial de mensajes"
        actions={
          <div className="flex items-center gap-2 text-sm">
            <form className="flex gap-2">
              <Select name="channel" defaultValue={filter.channel ?? ""} className="w-32"><option value="">Canal</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select>
              <Select name="status" defaultValue={filter.status ?? ""} className="w-36">
                <option value="">Estado</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <button className="underline">Filtrar</button>
            </form>
            {canEdit && <form action={retryFailed.bind(null, eventId)}><button className="underline">Reintentar fallidos</button></form>}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-xs uppercase text-stone-500"><tr><th className="py-2">Invitado</th><th>Canal</th><th>A</th><th>Origen</th><th>Estado</th><th>Enviado</th><th>Entregado</th><th>Abierto/leído</th><th>Respondió</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {(messages ?? []).map((m) => {
                const g = m.guest as unknown as { first_name: string; last_name: string | null } | null;
                const origin = (m.campaign as unknown as { name: string } | null)?.name ?? (m.automation as unknown as { name: string } | null)?.name ?? "";
                return (
                  <tr key={m.id}>
                    <td className="py-1.5">{g?.first_name} {g?.last_name}</td>
                    <td>{m.channel === "email" ? "Email" : "WhatsApp"}</td>
                    <td className="text-xs text-stone-500">{m.to_address}</td>
                    <td className="text-xs">{origin}</td>
                    <td><Badge tone={m.status}>{STATUS_LABELS[m.status as MessageStatus]}</Badge>{m.error && <div className="text-xs text-red-700">{m.error}</div>}</td>
                    <td className="text-xs">{fmt(m.sent_at)}</td><td className="text-xs">{fmt(m.delivered_at)}</td>
                    <td className="text-xs">{fmt(m.opened_at)}</td><td className="text-xs">{fmt(m.replied_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(messages ?? []).length === 0 && <p className="py-6 text-center text-sm text-stone-500">Sin mensajes.</p>}
        </div>
      </Card>
    </div>
  );
}

function TemplateForm({ eventId, t, canEdit }: { eventId: string; t?: TemplateRow; canEdit: boolean }) {
  return (
    <ActionForm action={saveTemplate.bind(null, eventId)} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={t?.id ?? ""} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Canal"><Select name="channel" defaultValue={t?.channel ?? "email"}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select></Field>
        <Field label="Nombre"><Input name="name" required defaultValue={t?.name} /></Field>
      </div>
      <Field label="Asunto (email)"><Input name="subject" defaultValue={t?.subject ?? ""} /></Field>
      <Field label="Mensaje"><Textarea name="body" required defaultValue={t?.body} rows={5} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Plantilla aprobada en Meta (WhatsApp)"><Input name="wa_template_name" defaultValue={t?.wa_template_name ?? ""} /></Field>
        <Field label="Idioma WhatsApp"><Input name="wa_language" defaultValue={t?.wa_language ?? "es"} /></Field>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <SubmitButton size="sm">Guardar</SubmitButton>
          {t && <button formAction={async () => { "use server"; await deleteTemplate(eventId, t.id); }} className="text-xs text-red-700 underline">Eliminar</button>}
        </div>
      )}
    </ActionForm>
  );
}
