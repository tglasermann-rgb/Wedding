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
  const t = text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[!¡.¿?,'’]/g, "").replace(/\s+/g, " ");
  if (["stop", "unsubscribe", "opt out", "baja", "alto", "cancelar suscripcion"].includes(t)) return "stop";
  if (["yes", "y", "yes ill be there", "ill be there", "count me in", "attending", "accept", "joyfully accepts", "im in", "rsvp_yes", "si", "confirmo", "si voy", "asistire", "si asistire", "claro"].includes(t)) return "yes";
  if (["no", "n", "cant make it", "cannot make it", "not attending", "decline", "regretfully declines", "rsvp_no", "no puedo", "no voy", "no asistire"].includes(t)) return "no";
  if (["maybe", "not sure", "not sure yet", "perhaps", "rsvp_maybe", "tal vez", "talvez", "quiza", "quizas", "no se"].includes(t)) return "maybe";
  return null;
}

export const RSVP_LABELS: Record<RsvpStatus, string> = { pending: "Pending", yes: "Yes", no: "No", maybe: "Maybe" };
