"use server";
import { revalidatePath } from "next/cache";
import { rsvpSubmissionSchema, type RsvpSubmission } from "@/lib/rsvp/logic";
import { submitRsvp } from "@/lib/rsvp/service";
import { createAdminClient } from "@/lib/supabase/admin";

const ERRORS: Record<string, string> = {
  deadline_passed: "La fecha límite para confirmar ya pasó. Contacta a los anfitriones.",
  event_inactive: "Las confirmaciones aún no están abiertas.",
  unknown_guest: "Hubo un problema con tu invitación.",
  unknown_session: "Hubo un problema con tu invitación.",
  too_many_plus_ones: "Agregaste más acompañantes de los permitidos.",
  not_found: "Invitación no encontrada.",
};

export async function submitRsvpAction(slug: string, input: RsvpSubmission) {
  const parsed = rsvpSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revisa los datos del formulario." };
  const r = await submitRsvp(createAdminClient(), parsed.data, "web");
  if (!r.ok) return { ok: false, message: ERRORS[r.error] ?? "Error" };
  revalidatePath(`/${slug}`);
  return { ok: true, message: "¡Gracias! Recibimos tu respuesta." };
}
