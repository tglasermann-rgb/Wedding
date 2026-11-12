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
  const providers = { email: env.sender() ? "Sender" : "test mode (console)", whatsapp: env.whatsapp() ? "Cloud API" : "not configured" };
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "");

  return (
    <div className="space-y-6">
      <p className="text-xs text-stone-500">Email: {providers.email} · WhatsApp: {providers.whatsapp}</p>

      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Send or schedule">
            {tpls.length === 0 ? <Empty>Create a template first.</Empty> : (
              <ActionForm action={createCampaign.bind(null, eventId)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Template">
                    <Select name="templateId" required>{tpls.map((t) => <option key={t.id} value={t.id}>{t.channel === "email" ? "✉" : "WA"} · {t.name}</option>)}</Select>
                  </Field>
                  <Field label="Send name"><Input name="name" placeholder="First invitation" /></Field>
                </div>
                <AudienceFields sessions={sessions} />
                <Field label="Schedule (optional)" hint="Leave empty to send now"><Input type="datetime-local" name="scheduled_at" /></Field>
                <SubmitButton pendingText="Sending…">Send</SubmitButton>
              </ActionForm>
            )}
          </Card>

          <Card title="Automatic reminders">
            <ul className="mb-4 space-y-2 text-sm">
              {(automations ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-2">
                  <span><b>{a.name}</b> — {a.days_before} days before · {a.template?.name}{a.last_run_at && <span className="text-xs text-stone-500"> (last ran {fmt(a.last_run_at)})</span>}</span>
                  <form action={toggleAutomation.bind(null, eventId, a.id, !a.enabled)}>
                    <button className="text-xs underline">{a.enabled ? "Pause" : "Turn on"}</button>
                  </form>
                </li>
              ))}
            </ul>
            {tpls.length > 0 && (
              <ActionForm action={createAutomation.bind(null, eventId)} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Name"><Input name="name" defaultValue="Reminder" /></Field>
                  <Field label="Days before"><Input name="days_before" type="number" min={0} defaultValue={30} /></Field>
                  <Field label="Template"><Select name="templateId">{tpls.map((t) => <option key={t.id} value={t.id}>{t.channel === "email" ? "✉" : "WA"} · {t.name}</option>)}</Select></Field>
                </div>
                <AudienceFields sessions={sessions} defaultRsvp={["pending", "maybe"]} />
                <SubmitButton variant="secondary">Create reminder</SubmitButton>
              </ActionForm>
            )}
          </Card>
        </div>
      )}

      <Card title="Templates">
        <div className="grid gap-4 lg:grid-cols-2">
          {tpls.map((t) => (
            <details key={t.id} className="rounded-lg border border-stone-200 p-3">
              <summary className="cursor-pointer text-sm"><Badge tone={t.channel === "email" ? "sent" : "replied"}>{t.channel === "email" ? "Email" : "WhatsApp"}</Badge> <b>{t.name}</b></summary>
              <TemplateForm eventId={eventId} t={t} canEdit={canEdit} />
            </details>
          ))}
          {canEdit && (
            <details className="rounded-lg border border-dashed border-stone-300 p-3">
              <summary className="cursor-pointer text-sm font-medium">+ New template</summary>
              <TemplateForm eventId={eventId} canEdit />
            </details>
          )}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Variables: {AVAILABLE_VARS.map((v) => `{{${v}}}`).join(" ")}. For WhatsApp, the template approved in Meta must use {"{{1}}, {{2}}…"} in the same order the variables appear here, with “Yes / No / Maybe” quick-reply buttons.
        </p>
      </Card>

      {(campaigns ?? []).length > 0 && (
        <Card title="Sends">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-100">
              {(campaigns ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5">{c.name}</td><td>{c.template?.name}</td>
                  <td>{c.scheduled_at ? fmt(c.scheduled_at) : fmt(c.created_at)}</td>
                  <td><Badge tone={c.status === "done" ? "sent" : c.status === "cancelled" ? "failed" : "queued"}>{c.status}</Badge></td>
                  <td className="text-right">{c.status === "scheduled" && canEdit && <form action={cancelCampaign.bind(null, eventId, c.id)}><button className="text-xs underline">Cancel</button></form>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        title="Message history"
        actions={
          <div className="flex items-center gap-2 text-sm">
            <form className="flex gap-2">
              <Select name="channel" defaultValue={filter.channel ?? ""} className="w-32"><option value="">Channel</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select>
              <Select name="status" defaultValue={filter.status ?? ""} className="w-36">
                <option value="">Status</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <button className="underline">Filter</button>
            </form>
            {canEdit && <form action={retryFailed.bind(null, eventId)}><button className="underline">Retry failed</button></form>}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-xs uppercase text-stone-500"><tr><th className="py-2">Guest</th><th>Channel</th><th>To</th><th>Source</th><th>Status</th><th>Sent</th><th>Delivered</th><th>Opened/read</th><th>Replied</th></tr></thead>
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
          {(messages ?? []).length === 0 && <p className="py-6 text-center text-sm text-stone-500">No messages yet.</p>}
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
        <Field label="Channel"><Select name="channel" defaultValue={t?.channel ?? "email"}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select></Field>
        <Field label="Name"><Input name="name" required defaultValue={t?.name} /></Field>
      </div>
      <Field label="Subject (email)"><Input name="subject" defaultValue={t?.subject ?? ""} /></Field>
      <Field label="Message"><Textarea name="body" required defaultValue={t?.body} rows={5} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Approved Meta template name (WhatsApp)"><Input name="wa_template_name" defaultValue={t?.wa_template_name ?? ""} /></Field>
        <Field label="WhatsApp language"><Input name="wa_language" defaultValue={t?.wa_language ?? "en_US"} /></Field>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <SubmitButton size="sm">Save</SubmitButton>
          {t && <button formAction={async () => { "use server"; await deleteTemplate(eventId, t.id); }} className="text-xs text-red-700 underline">Delete</button>}
        </div>
      )}
    </ActionForm>
  );
}
