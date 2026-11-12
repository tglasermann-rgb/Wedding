"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEvent } from "@/lib/auth";
import { audienceSchema } from "@/lib/messaging/audience";
import { dispatchQueued, enqueue } from "@/lib/messaging/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/components/action-form";

const path = (id: string) => `/dashboard/${id}/messages`;

const templateSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  channel: z.enum(["email", "whatsapp"]),
  name: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  wa_template_name: z.string().optional(),
  wa_language: z.string().optional(),
});

export async function saveTemplate(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireEvent(eventId, { edit: true });
  const p = templateSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { id, ...row } = p.data;
  const data = { ...row, event_id: eventId, subject: row.subject || null, wa_template_name: row.wa_template_name || null, wa_language: row.wa_language || "en_US" };
  const { error } = id ? await supabase.from("message_templates").update(data).eq("id", id) : await supabase.from("message_templates").insert(data);
  revalidatePath(path(eventId));
  return error ? { ok: false, message: error.message } : { ok: true, message: "Template saved." };
}

export async function deleteTemplate(eventId: string, id: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("message_templates").delete().eq("id", id);
  revalidatePath(path(eventId));
}

function audienceFrom(fd: FormData) {
  return audienceSchema.parse({
    rsvp: fd.getAll("rsvp").map(String).filter(Boolean),
    sessionId: String(fd.get("sessionId") || "") || undefined,
    tags: String(fd.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
    side: String(fd.get("side") || "") || undefined,
    includeChildren: fd.get("includeChildren") ? true : false,
  });
}

export async function createCampaign(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase } = await requireEvent(eventId, { edit: true });
    const templateId = z.string().uuid().parse(fd.get("templateId"));
    const audience = audienceFrom(fd);
    const when = String(fd.get("scheduled_at") || "");
    const name = String(fd.get("name") || "Send");
    if (when) {
      const { error } = await supabase.from("campaigns").insert({
        event_id: eventId, template_id: templateId, name, audience, scheduled_at: new Date(when).toISOString(), status: "scheduled",
      });
      if (error) throw error;
      revalidatePath(path(eventId));
      return { ok: true, message: `Scheduled for ${new Date(when).toLocaleString("en-US")}.` };
    }
    const { data: c, error } = await supabase.from("campaigns").insert({ event_id: eventId, template_id: templateId, name, audience, status: "sending" }).select("id").single();
    if (error) throw error;
    const r = await enqueue(supabase, { eventId, templateId, audience, campaignId: c.id });
    await supabase.from("campaigns").update({ status: "done" }).eq("id", c.id);
    const d = await dispatchQueued(createAdminClient(), 100);
    revalidatePath(path(eventId));
    return {
      ok: true,
      message: `${r.queued} messages queued, ${d.sent} sent so far${r.skippedNoContact ? `; ${r.skippedNoContact} with no contact for this channel` : ""}. The rest will go out in the next few minutes.`,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function previewAudience(eventId: string, fd: FormData) {
  const { supabase } = await requireEvent(eventId);
  const { loadGuests } = await import("@/lib/data");
  const { resolveAudience } = await import("@/lib/messaging/audience");
  const { data: tpl } = await supabase.from("message_templates").select("channel").eq("id", String(fd.get("templateId"))).single();
  const r = resolveAudience(await loadGuests(supabase, eventId), audienceFrom(fd), tpl?.channel ?? "email");
  return { recipients: r.recipients.length, skipped: r.skippedNoContact.length };
}

export async function cancelCampaign(eventId: string, id: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("campaigns").update({ status: "cancelled" }).eq("id", id).eq("status", "scheduled");
  revalidatePath(path(eventId));
}

export async function createAutomation(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase } = await requireEvent(eventId, { edit: true });
    const { error } = await supabase.from("automations").insert({
      event_id: eventId,
      template_id: z.string().uuid().parse(fd.get("templateId")),
      name: String(fd.get("name") || "Reminder"),
      days_before: z.coerce.number().int().min(0).max(365).parse(fd.get("days_before")),
      audience: audienceFrom(fd),
    });
    if (error) throw error;
    revalidatePath(path(eventId));
    return { ok: true, message: "Automatic reminder created." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function toggleAutomation(eventId: string, id: string, enabled: boolean) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("automations").update({ enabled }).eq("id", id);
  revalidatePath(path(eventId));
}

export async function retryFailed(eventId: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("messages").update({ status: "queued", attempts: 0, error: null }).eq("event_id", eventId).eq("status", "failed");
  await dispatchQueued(createAdminClient(), 100);
  revalidatePath(path(eventId));
}
