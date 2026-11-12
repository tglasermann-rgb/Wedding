"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEvent } from "@/lib/auth";
import { groupHouseholds, normalizePhone, type ImportRow } from "@/lib/guests/import";
import type { ActionState } from "@/components/action-form";

const path = (id: string) => `/dashboard/${id}/guests`;

async function checkGuestLimit(sb: Awaited<ReturnType<typeof requireEvent>>["supabase"], eventId: string, max: number, adding: number) {
  const { count } = await sb.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  if ((count ?? 0) + adding > max) throw new Error(`Tu plan permite ${max} invitados (tienes ${count}).`);
}

/** Members textarea: one per line "Nombre Apellido, email, teléfono" (email/phone optional, any order). */
function parseMembers(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(",").map((s) => s.trim());
    const [name, ...rest] = parts;
    const [first, ...last] = name.split(/\s+/);
    const email = rest.find((r) => r.includes("@")) ?? null;
    const phoneRaw = rest.find((r) => !r.includes("@") && /\d/.test(r));
    const child = rest.some((r) => /^(niño|nino|niña|child)$/i.test(r));
    return { first_name: first, last_name: last.join(" ") || null, email: email?.toLowerCase() ?? null, phone: normalizePhone(phoneRaw), is_child: child };
  });
}

export async function addHousehold(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase, event } = await requireEvent(eventId, { edit: true });
    const members = parseMembers(String(fd.get("members") ?? ""));
    if (!members.length) return { ok: false, message: "Agrega al menos una persona." };
    await checkGuestLimit(supabase, eventId, event.limits.max_guests, members.length);
    const name = String(fd.get("name") || `${members[0].first_name} ${members[0].last_name ?? ""}`).trim();
    const { data: hh, error } = await supabase.from("households").insert({
      event_id: eventId, name, side: String(fd.get("side") || "") || null,
      max_plus_ones: Number(fd.get("max_plus_ones") || 0),
      tags: String(fd.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    }).select("id").single();
    if (error) throw error;
    const { error: gErr } = await supabase.from("guests").insert(members.map((m) => ({ ...m, event_id: eventId, household_id: hh.id })));
    if (gErr) throw gErr;
    revalidatePath(path(eventId));
    return { ok: true, message: `Invitación "${name}" agregada (${members.length}).` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function importGuests(eventId: string, rows: ImportRow[]): Promise<ActionState> {
  try {
    const { supabase, event } = await requireEvent(eventId, { edit: true });
    await checkGuestLimit(supabase, eventId, event.limits.max_guests, rows.length);
    const { data: existing } = await supabase.from("households").select("id,name").eq("event_id", eventId);
    const byName = new Map((existing ?? []).map((h) => [h.name.trim().toLowerCase(), h.id]));
    let created = 0, guests = 0;
    for (const h of groupHouseholds(rows)) {
      let id = byName.get(h.name.trim().toLowerCase());
      if (!id) {
        const { data, error } = await supabase.from("households")
          .insert({ event_id: eventId, name: h.name, side: h.side, tags: h.tags, max_plus_ones: h.plus_ones }).select("id").single();
        if (error) throw error;
        id = data.id; created++;
      }
      const { error } = await supabase.from("guests").insert(h.guests.map((g) => ({
        event_id: eventId, household_id: id, first_name: g.first_name, last_name: g.last_name, email: g.email, phone: g.phone, is_child: g.is_child,
      })));
      if (error) throw error;
      guests += h.guests.length;
    }
    revalidatePath(path(eventId));
    return { ok: true, message: `Importados ${guests} invitados en ${created} invitaciones nuevas.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

const guestUpdate = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("").transform(() => null)),
  phone: z.string().nullable().optional(),
  dietary: z.string().nullable().optional(),
  is_child: z.boolean().optional(),
});

export async function updateGuest(eventId: string, input: z.input<typeof guestUpdate>): Promise<ActionState> {
  const { supabase } = await requireEvent(eventId, { edit: true });
  const p = guestUpdate.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { id, ...patch } = p.data;
  if (patch.phone !== undefined) {
    const n = patch.phone ? normalizePhone(patch.phone) : null;
    if (patch.phone && !n) return { ok: false, message: "Teléfono inválido" };
    patch.phone = n;
  }
  const { error } = await supabase.from("guests").update(patch).eq("id", id).eq("event_id", eventId);
  revalidatePath(path(eventId));
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function setRsvp(eventId: string, guestId: string, sessionId: string, status: "pending" | "yes" | "no" | "maybe") {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("rsvp_responses").upsert({
    guest_id: guestId, session_id: sessionId, event_id: eventId, status, channel: "admin", responded_at: new Date().toISOString(),
  });
  revalidatePath(path(eventId));
}

export async function deleteGuest(eventId: string, guestId: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("guests").delete().eq("id", guestId).eq("event_id", eventId);
  // drop now-empty households
  const { data: empty } = await supabase.from("households").select("id, guests(id)").eq("event_id", eventId);
  const ids = (empty ?? []).filter((h) => !(h.guests as unknown[]).length).map((h) => h.id);
  if (ids.length) await supabase.from("households").delete().in("id", ids);
  revalidatePath(path(eventId));
}
