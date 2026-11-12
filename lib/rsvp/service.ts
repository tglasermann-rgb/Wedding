import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RsvpChannel, RsvpStatus } from "../types";
import { validateRsvp, type RsvpError, type RsvpSubmission } from "./logic";

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Single entry point for writing RSVPs (web form, WhatsApp replies, admin edits).
 * `sb` must be the service-role client: the token is the authorisation.
 */
export async function submitRsvp(sb: SupabaseClient, sub: RsvpSubmission, channel: RsvpChannel = "web"): Promise<{ ok: true } | { ok: false; error: RsvpError | "not_found" }> {
  const { data: hh } = await sb
    .from("households")
    .select("id, event_id, max_plus_ones, guests(id, is_plus_one), event:events(status, rsvp_deadline, timezone)")
    .eq("token", sub.token)
    .maybeSingle();
  if (!hh) return { ok: false, error: "not_found" };
  const event = hh.event as unknown as { status: string; rsvp_deadline: string | null; timezone: string };
  const guests = hh.guests as { id: string; is_plus_one: boolean }[];
  const { data: sessions } = await sb.from("event_sessions").select("id").eq("event_id", hh.event_id);

  const err = validateRsvp(sub, {
    today: todayIn(event.timezone),
    deadline: event.rsvp_deadline,
    eventActive: event.status === "active",
    householdGuestIds: guests.map((g) => g.id),
    sessionIds: (sessions ?? []).map((s) => s.id),
    maxPlusOnes: hh.max_plus_ones,
    existingPlusOnes: guests.filter((g) => g.is_plus_one).length,
  });
  if (err) return { ok: false, error: err };

  const now = new Date().toISOString();
  const responses = [...sub.responses];

  if (sub.plusOnes.length) {
    const { data: added, error } = await sb
      .from("guests")
      .insert(sub.plusOnes.map((p) => ({ event_id: hh.event_id, household_id: hh.id, first_name: p.firstName, last_name: p.lastName ?? null, is_plus_one: true })))
      .select("id");
    if (error) throw error;
    // plus-ones attend whatever sessions the household said yes to
    const yesSessions = [...new Set(sub.responses.filter((r) => r.status === "yes").map((r) => r.sessionId))];
    for (const g of added ?? []) for (const s of yesSessions) responses.push({ guestId: g.id, sessionId: s, status: "yes" });
  }

  if (responses.length) {
    const { error } = await sb.from("rsvp_responses").upsert(
      responses.map((r) => ({ guest_id: r.guestId, session_id: r.sessionId, event_id: hh.event_id, status: r.status, channel, responded_at: now })),
    );
    if (error) throw error;
  }
  if (sub.answers.length)
    await sb.from("rsvp_answers").upsert(sub.answers.map((a) => ({ question_id: a.questionId, guest_id: a.guestId, event_id: hh.event_id, value: a.value })));
  for (const d of sub.dietary) await sb.from("guests").update({ dietary: d.value || null }).eq("id", d.guestId).eq("household_id", hh.id);
  return { ok: true };
}

/** Set one guest's status for all sessions (used by WhatsApp quick replies). */
export async function setGuestStatusAllSessions(sb: SupabaseClient, guestId: string, eventId: string, status: RsvpStatus, channel: RsvpChannel) {
  const { data: sessions } = await sb.from("event_sessions").select("id").eq("event_id", eventId);
  if (!sessions?.length) return;
  await sb.from("rsvp_responses").upsert(
    sessions.map((s) => ({ guest_id: guestId, session_id: s.id, event_id: eventId, status, channel, responded_at: new Date().toISOString() })),
  );
}
