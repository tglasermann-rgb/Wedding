import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guestStatus } from "./messaging/audience";
import type { GuestWithContext, HouseholdRow, MessageRow, RsvpStatus, SessionRow } from "./types";

export async function loadSessions(sb: SupabaseClient, eventId: string): Promise<SessionRow[]> {
  const { data } = await sb.from("event_sessions").select("*").eq("event_id", eventId).order("sort").order("starts_at");
  return (data ?? []) as SessionRow[];
}

export async function loadHouseholds(sb: SupabaseClient, eventId: string): Promise<HouseholdRow[]> {
  const { data } = await sb.from("households").select("*").eq("event_id", eventId).order("name");
  return (data ?? []) as HouseholdRow[];
}

/** All guests of an event with their household and RSVP rows. */
export async function loadGuests(sb: SupabaseClient, eventId: string): Promise<GuestWithContext[]> {
  const { data, error } = await sb
    .from("guests")
    .select("*, household:households(id,name,token,side,tags), rsvps:rsvp_responses(session_id,status)")
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as GuestWithContext[];
}

export interface EventStats {
  guests: number;
  adults: number;
  children: number;
  households: number;
  byStatus: Record<RsvpStatus, number>;
  bySession: { session: SessionRow; byStatus: Record<RsvpStatus, number>; attendingAdults: number; attendingChildren: number }[];
  noContact: number;
  dietary: { name: string; value: string }[];
  messages: { channel: "email" | "whatsapp"; total: number; sent: number; delivered: number; opened: number; failed: number; replied: number }[];
}

const emptyCounts = (): Record<RsvpStatus, number> => ({ pending: 0, yes: 0, no: 0, maybe: 0 });

export function computeStats(guests: GuestWithContext[], sessions: SessionRow[], messages: Pick<MessageRow, "channel" | "status" | "delivered_at" | "opened_at" | "replied_at" | "sent_at">[]): EventStats {
  const byStatus = emptyCounts();
  for (const g of guests) byStatus[guestStatus(g)]++;
  const bySession = sessions.map((session) => {
    const c = emptyCounts();
    let attendingAdults = 0, attendingChildren = 0;
    for (const g of guests) {
      const s = guestStatus(g, session.id);
      c[s]++;
      if (s === "yes") {
        if (g.is_child) attendingChildren++;
        else attendingAdults++;
      }
    }
    return { session, byStatus: c, attendingAdults, attendingChildren };
  });
  const msgs = (["email", "whatsapp"] as const).map((channel) => {
    const m = messages.filter((x) => x.channel === channel);
    return {
      channel,
      total: m.length,
      sent: m.filter((x) => x.sent_at).length,
      delivered: m.filter((x) => x.delivered_at || x.opened_at).length,
      opened: m.filter((x) => x.opened_at).length,
      failed: m.filter((x) => x.status === "failed" || x.status === "bounced").length,
      replied: m.filter((x) => x.replied_at).length,
    };
  });
  return {
    guests: guests.length,
    adults: guests.filter((g) => !g.is_child).length,
    children: guests.filter((g) => g.is_child).length,
    households: new Set(guests.map((g) => g.household_id)).size,
    byStatus,
    bySession,
    noContact: guests.filter((g) => !g.email && !g.phone).length,
    dietary: guests.filter((g) => g.dietary).map((g) => ({ name: `${g.first_name} ${g.last_name ?? ""}`.trim(), value: g.dietary! })),
    messages: msgs,
  };
}

export function rsvpLink(appUrl: string, slug: string, token: string) {
  return `${appUrl}/${slug}?i=${token}`;
}
