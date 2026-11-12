"use server";
import { revalidatePath } from "next/cache";
import { requireEvent } from "@/lib/auth";
import { sectionsSchema, type SiteSection } from "@/lib/site/schema";
import { THEMES } from "@/lib/site/themes";

export async function saveSite(eventId: string, input: { themeId: string; published: boolean; sections: SiteSection[] }) {
  const { supabase, event } = await requireEvent(eventId, { edit: true });
  const sections = sectionsSchema.parse(input.sections);
  if (!THEMES[input.themeId]) throw new Error("Tema inválido");
  const { error } = await supabase.from("event_sites").upsert({
    event_id: eventId, theme_id: input.themeId, published: input.published, sections, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/${event.slug}`);
  return { ok: true };
}
