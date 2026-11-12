import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import { loadGuests, rsvpLink } from "../data";
import type { EventRow, MessageRow, MessageStatus, TemplateRow } from "../types";
import { resolveAudience, type Audience } from "./audience";
import { consoleEmailProvider, type EmailProvider } from "./email-provider";
import { buildEmailHtml } from "./email-html";
import { renderTemplate, templateVariables, type TemplateVars } from "./render-template";
import { senderProvider } from "./sender";
import { nextStatus, STATUS_TIMESTAMP } from "./status";
import { sendWhatsAppTemplate } from "./whatsapp";

const MAX_ATTEMPTS = 3;

export function emailProvider(): EmailProvider {
  const cfg = env.sender();
  return cfg ? senderProvider(cfg) : consoleEmailProvider;
}

/** Create queued messages for every guest matching the audience. Returns counts. */
export async function enqueue(
  sb: SupabaseClient,
  p: { eventId: string; templateId: string; audience: Audience; campaignId?: string; automationId?: string },
) {
  const { data: tpl } = await sb.from("message_templates").select("*").eq("id", p.templateId).single<TemplateRow>();
  const { data: event } = await sb.from("events").select("*").eq("id", p.eventId).single<EventRow>();
  if (!tpl || !event) throw new Error("Plantilla o evento no encontrado");
  if (event.status !== "active") throw new Error("El evento no está activo. Pide a soporte que lo active.");

  const guests = await loadGuests(sb, p.eventId);
  const { recipients, skippedNoContact } = resolveAudience(guests, p.audience, tpl.channel);

  const { count: used } = await sb.from("messages").select("id", { count: "exact", head: true }).eq("event_id", p.eventId);
  const remaining = (event.limits?.max_messages ?? 0) - (used ?? 0);
  if (recipients.length > remaining) throw new Error(`Cuota de mensajes insuficiente (quedan ${Math.max(remaining, 0)}).`);

  if (recipients.length) {
    const { error } = await sb.from("messages").insert(
      recipients.map(({ guest, to }) => ({
        event_id: p.eventId, guest_id: guest.id, campaign_id: p.campaignId ?? null, automation_id: p.automationId ?? null,
        channel: tpl.channel, to_address: to, template_id: tpl.id, status: "queued",
      })),
    );
    if (error) throw error;
  }
  return { queued: recipients.length, skippedNoContact: skippedNoContact.length };
}

async function varsFor(sb: SupabaseClient, m: MessageRow, event: EventRow): Promise<TemplateVars> {
  const { data: g } = await sb.from("guests").select("first_name,last_name,household:households(name,token)").eq("id", m.guest_id).single();
  const hh = g?.household as unknown as { name: string; token: string } | undefined;
  const app = env.appUrl();
  return {
    first_name: g?.first_name, last_name: g?.last_name, household: hh?.name,
    event_title: event.title, hosts: event.hosts ?? event.title,
    event_date: event.event_date ? new Date(event.event_date + "T12:00:00").toLocaleDateString(event.locale, { dateStyle: "long" }) : "",
    rsvp_link: hh ? rsvpLink(app, event.slug, hh.token) : `${app}/${event.slug}`,
    site_link: `${app}/${event.slug}`,
  };
}

/** Claim and send up to `batch` queued messages. Called by the cron route. */
export async function dispatchQueued(sb: SupabaseClient, batch = 50) {
  const { data: claimed, error } = await sb.rpc("claim_messages", { batch });
  if (error) throw error;
  const msgs = (claimed ?? []) as MessageRow[];
  const email = emailProvider();
  const wa = env.whatsapp();
  const app = env.appUrl();
  const cache = new Map<string, { event: EventRow; tpl: TemplateRow }>();
  let sent = 0, failed = 0;

  for (const m of msgs) {
    const key = `${m.event_id}:${m.template_id}`;
    if (!cache.has(key)) {
      const [{ data: event }, { data: tpl }] = await Promise.all([
        sb.from("events").select("*").eq("id", m.event_id).single<EventRow>(),
        sb.from("message_templates").select("*").eq("id", m.template_id).single<TemplateRow>(),
      ]);
      if (event && tpl) cache.set(key, { event, tpl });
    }
    const ctx = cache.get(key);
    if (!ctx) { await sb.from("messages").update({ status: "failed", error: "Plantilla eliminada" }).eq("id", m.id); failed++; continue; }

    const vars = await varsFor(sb, m, ctx.event);
    const body = renderTemplate(ctx.tpl.body, vars);
    let result;
    if (m.channel === "email") {
      const subject = renderTemplate(ctx.tpl.subject ?? ctx.event.title, vars);
      const html = buildEmailHtml({
        title: ctx.event.hosts ?? ctx.event.title,
        bodyText: body,
        ctaUrl: String(vars.rsvp_link),
        trackClick: (u) => `${app}/api/t/c/${m.id}?u=${encodeURIComponent(u)}`,
        pixelUrl: `${app}/api/t/o/${m.id}`,
      });
      result = await email.send({ to: m.to_address, subject, html, text: body });
      await sb.from("messages").update({ subject, body }).eq("id", m.id);
    } else if (!wa) {
      result = { ok: false, error: "WhatsApp no configurado", retryable: false };
    } else if (!ctx.tpl.wa_template_name) {
      result = { ok: false, error: "La plantilla no tiene nombre de plantilla aprobada de WhatsApp", retryable: false };
    } else {
      result = await sendWhatsAppTemplate(wa, {
        to: m.to_address, templateName: ctx.tpl.wa_template_name, language: ctx.tpl.wa_language ?? "es",
        bodyParams: templateVariables(ctx.tpl.body).map((v) => String(vars[v] ?? "")),
      });
      await sb.from("messages").update({ body }).eq("id", m.id);
    }

    if (result.ok) {
      sent++;
      await sb.from("messages").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.providerId ?? null, error: null }).eq("id", m.id);
    } else {
      const retry = result.retryable && m.attempts < MAX_ATTEMPTS;
      if (!retry) failed++;
      await sb.from("messages").update({ status: retry ? "queued" : "failed", error: result.error ?? "Error" }).eq("id", m.id);
    }
  }
  return { claimed: msgs.length, sent, failed };
}

/** Apply a tracking/webhook status to a message, never regressing it. */
export async function applyStatus(
  sb: SupabaseClient,
  where: { id?: string; providerId?: string },
  incoming: MessageStatus,
  extra: { error?: string; payload?: unknown; at?: Date } = {},
) {
  let q = sb.from("messages").select("id,event_id,status");
  q = where.id ? q.eq("id", where.id) : q.eq("provider_message_id", where.providerId!);
  const { data: m } = await q.maybeSingle<{ id: string; event_id: string; status: MessageStatus }>();
  if (!m) return null;
  const status = nextStatus(m.status, incoming);
  const patch: Record<string, unknown> = { status };
  const col = STATUS_TIMESTAMP[incoming];
  if (col) patch[col] = (extra.at ?? new Date()).toISOString();
  if (incoming === "clicked" || incoming === "replied") patch.opened_at ??= patch[col!];
  if (extra.error) patch.error = extra.error;
  // only set timestamp columns that are still empty
  const { data: cur } = await sb.from("messages").select("sent_at,delivered_at,opened_at,clicked_at,replied_at").eq("id", m.id).single();
  for (const k of ["sent_at", "delivered_at", "opened_at", "clicked_at", "replied_at"]) if (cur?.[k as keyof typeof cur]) delete patch[k];
  await sb.from("messages").update(patch).eq("id", m.id);
  await sb.from("message_events").insert({ message_id: m.id, event_id: m.event_id, kind: incoming, payload: extra.payload ?? null });
  return m;
}

/** Enqueue due scheduled campaigns and automations. */
export async function runSchedules(sb: SupabaseClient) {
  const now = new Date();
  const results: string[] = [];

  const { data: due } = await sb.from("campaigns").select("*").eq("status", "scheduled").lte("scheduled_at", now.toISOString());
  for (const c of due ?? []) {
    try {
      await sb.from("campaigns").update({ status: "sending" }).eq("id", c.id);
      const r = await enqueue(sb, { eventId: c.event_id, templateId: c.template_id, audience: c.audience, campaignId: c.id });
      await sb.from("campaigns").update({ status: "done" }).eq("id", c.id);
      results.push(`campaign ${c.id}: ${r.queued}`);
    } catch (e) {
      await sb.from("campaigns").update({ status: "cancelled" }).eq("id", c.id);
      results.push(`campaign ${c.id}: error ${(e as Error).message}`);
    }
  }

  const { data: autos } = await sb.from("automations").select("*, event:events(event_date,status)").eq("enabled", true).is("last_run_at", null);
  for (const a of autos ?? []) {
    const ev = a.event as { event_date: string | null; status: string };
    if (!ev?.event_date || ev.status !== "active") continue;
    const runOn = new Date(ev.event_date + "T10:00:00Z");
    runOn.setUTCDate(runOn.getUTCDate() - a.days_before);
    if (runOn > now) continue;
    try {
      const r = await enqueue(sb, { eventId: a.event_id, templateId: a.template_id, audience: a.audience, automationId: a.id });
      results.push(`automation ${a.id}: ${r.queued}`);
    } catch (e) {
      results.push(`automation ${a.id}: error ${(e as Error).message}`);
    }
    await sb.from("automations").update({ last_run_at: now.toISOString() }).eq("id", a.id);
  }
  return results;
}
