import { z } from "zod";
import type { GuestWithContext, MessageChannel, RsvpStatus } from "../types";

export const audienceSchema = z.object({
  rsvp: z.array(z.enum(["pending", "yes", "no", "maybe"])).optional(),
  sessionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  side: z.string().optional(),
  householdIds: z.array(z.string()).optional(),
  includeChildren: z.boolean().optional(),
});
export type Audience = z.infer<typeof audienceSchema>;

/** Aggregate RSVP status of a guest: any yes > maybe > no > pending (optionally for one session). */
export function guestStatus(g: Pick<GuestWithContext, "rsvps">, sessionId?: string): RsvpStatus {
  const rs = sessionId ? g.rsvps.filter((r) => r.session_id === sessionId) : g.rsvps;
  if (rs.some((r) => r.status === "yes")) return "yes";
  if (rs.some((r) => r.status === "maybe")) return "maybe";
  if (rs.length > 0 && rs.every((r) => r.status === "no")) return "no";
  return "pending";
}

export function contactFor(g: GuestWithContext, channel: MessageChannel): string | null {
  if (channel === "email") return g.email_opt_out ? null : g.email || null;
  return g.whatsapp_opt_out ? null : g.phone || null;
}

export function matchesAudience(g: GuestWithContext, a: Audience): boolean {
  if (a.includeChildren === false && g.is_child) return false;
  if (a.householdIds?.length && !a.householdIds.includes(g.household_id)) return false;
  if (a.side && g.household.side !== a.side) return false;
  if (a.tags?.length && !a.tags.some((t) => g.household.tags.includes(t))) return false;
  if (a.rsvp?.length && !a.rsvp.includes(guestStatus(g, a.sessionId))) return false;
  return true;
}

export interface AudienceResult {
  recipients: { guest: GuestWithContext; to: string }[];
  skippedNoContact: GuestWithContext[];
}

export function resolveAudience(guests: GuestWithContext[], a: Audience, channel: MessageChannel): AudienceResult {
  const recipients: AudienceResult["recipients"] = [];
  const skippedNoContact: GuestWithContext[] = [];
  for (const g of guests) {
    if (!matchesAudience(g, a)) continue;
    const to = contactFor(g, channel);
    if (to) recipients.push({ guest: g, to });
    else skippedNoContact.push(g);
  }
  return { recipients, skippedNoContact };
}
