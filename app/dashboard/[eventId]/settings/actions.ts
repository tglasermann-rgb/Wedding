"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEvent } from "@/lib/auth";
import type { ActionState } from "@/components/action-form";

const path = (id: string) => `/dashboard/${id}/settings`;
const opt = z.string().optional().transform((v) => v || null);

export async function updateEvent(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, event } = await requireEvent(eventId, { edit: true });
  const p = z.object({ title: z.string().min(2), hosts: opt, event_date: opt, rsvp_deadline: opt, timezone: z.string().min(3) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { error } = await supabase.from("events").update(p.data).eq("id", eventId);
  revalidatePath(path(eventId));
  revalidatePath(`/${event.slug}`);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Saved." };
}

export async function saveSession(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, event } = await requireEvent(eventId, { edit: true });
  const p = z.object({
    id: opt, name: z.string().min(1), starts_at: opt, venue_name: opt, address: opt, map_url: opt, sort: z.coerce.number().default(0),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { id, starts_at, ...rest } = p.data;
  // datetime-local is wall-clock time in the event's timezone; store as UTC
  const row = { ...rest, event_id: eventId, starts_at: starts_at ? zonedToUtc(starts_at, event.timezone) : null };
  const { error } = id ? await supabase.from("event_sessions").update(row).eq("id", id) : await supabase.from("event_sessions").insert(row);
  revalidatePath(path(eventId));
  revalidatePath(`/${event.slug}`);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Saved." };
}

export async function deleteSession(eventId: string, id: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("event_sessions").delete().eq("id", id).eq("event_id", eventId);
  revalidatePath(path(eventId));
}

export async function addQuestion(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireEvent(eventId, { edit: true });
  const label = String(fd.get("label") || "").trim();
  if (!label) return { ok: false, message: "Enter a question" };
  const options = String(fd.get("options") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const { error } = await supabase.from("rsvp_questions").insert({ event_id: eventId, label, kind: options.length ? "select" : "text", options });
  revalidatePath(path(eventId));
  return error ? { ok: false, message: error.message } : { ok: true, message: "Question added." };
}

export async function deleteQuestion(eventId: string, id: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("rsvp_questions").delete().eq("id", id).eq("event_id", eventId);
  revalidatePath(path(eventId));
}

/** Convert "YYYY-MM-DDTHH:mm" wall time in `tz` to an ISO UTC string. */
function zonedToUtc(local: string, tz: string): string {
  const asUtc = new Date(local + ":00Z");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(asUtc).reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const tzWall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(asUtc.getTime() - (tzWall - asUtc.getTime())).toISOString();
}
