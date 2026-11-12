import { z } from "zod";
import type { RsvpStatus } from "../types";

export const rsvpSubmissionSchema = z.object({
  token: z.string().min(8),
  responses: z.array(
    z.object({ guestId: z.string().uuid(), sessionId: z.string().uuid(), status: z.enum(["yes", "no", "maybe"]) }),
  ),
  plusOnes: z.array(z.object({ firstName: z.string().min(1).max(80), lastName: z.string().max(80).optional() })).default([]),
  answers: z.array(z.object({ questionId: z.string().uuid(), guestId: z.string().uuid(), value: z.string().max(1000) })).default([]),
  dietary: z.array(z.object({ guestId: z.string().uuid(), value: z.string().max(300) })).default([]),
});
export type RsvpSubmission = z.infer<typeof rsvpSubmissionSchema>;

export type RsvpError = "deadline_passed" | "event_inactive" | "unknown_guest" | "too_many_plus_ones" | "unknown_session";

export interface RsvpContext {
  today: string; // YYYY-MM-DD in event tz
  deadline: string | null;
  eventActive: boolean;
  householdGuestIds: string[];
  sessionIds: string[];
  maxPlusOnes: number;
  existingPlusOnes: number;
}

/** Pure validation of a submission against the household/event context. */
export function validateRsvp(sub: RsvpSubmission, ctx: RsvpContext): RsvpError | null {
  if (!ctx.eventActive) return "event_inactive";
  if (ctx.deadline && ctx.today > ctx.deadline) return "deadline_passed";
  for (const r of sub.responses) {
    if (!ctx.householdGuestIds.includes(r.guestId)) return "unknown_guest";
    if (!ctx.sessionIds.includes(r.sessionId)) return "unknown_session";
  }
  for (const a of [...sub.answers, ...sub.dietary]) if (!ctx.householdGuestIds.includes(a.guestId)) return "unknown_guest";
  if (ctx.existingPlusOnes + sub.plusOnes.length > ctx.maxPlusOnes) return "too_many_plus_ones";
  return null;
}

/** Interpret a free-text / button reply (WhatsApp, email) as an RSVP status. */
export function parseReply(text: string): RsvpStatus | "stop" | null {
  const t = text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[!¡.¿?]/g, "");
  if (["stop", "unsubscribe", "stop messages", "baja"].includes(t)) return "stop";
  if (["yes", "y", "yep", "sure", "attending", "i will attend", "count me in", "si", "rsvp_yes"].includes(t)) return "yes";
  if (["no", "n", "nope", "cant", "can't", "cannot", "not attending", "rsvp_no"].includes(t)) return "no";
  if (["maybe", "perhaps", "not sure", "tal vez", "rsvp_maybe"].includes(t)) return "maybe";
  return null;
}

export const RSVP_LABELS: Record<RsvpStatus, string> = { pending: "Pending", yes: "Yes", no: "No", maybe: "Maybe" };
