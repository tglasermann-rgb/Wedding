"use server";
import { revalidatePath } from "next/cache";
import { rsvpSubmissionSchema, type RsvpSubmission } from "@/lib/rsvp/logic";
import { submitRsvp } from "@/lib/rsvp/service";
import { createAdminClient } from "@/lib/supabase/admin";

const ERRORS: Record<string, string> = {
  deadline_passed: "The RSVP deadline has passed. Please contact the hosts.",
  event_inactive: "RSVPs aren't open yet.",
  unknown_guest: "Something went wrong with your invitation.",
  unknown_session: "Something went wrong with your invitation.",
  too_many_plus_ones: "You added more plus-ones than your invitation allows.",
  not_found: "Invitation not found.",
};

export async function submitRsvpAction(slug: string, input: RsvpSubmission) {
  const parsed = rsvpSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the form and try again." };
  const r = await submitRsvp(createAdminClient(), parsed.data, "web");
  if (!r.ok) return { ok: false, message: ERRORS[r.error] ?? "Error" };
  revalidatePath(`/${slug}`);
  return { ok: true, message: "Thank you! We received your RSVP." };
}
