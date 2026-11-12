import { z } from "zod";

const base = { id: z.string().min(1), hidden: z.boolean().optional() };

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("hero"), title: z.string(), subtitle: z.string().default(""), imageUrl: z.string().default("") }),
  z.object({ ...base, type: z.literal("countdown") }),
  z.object({ ...base, type: z.literal("text"), title: z.string(), body: z.string().default("") }),
  z.object({ ...base, type: z.literal("schedule"), title: z.string() }),
  z.object({
    ...base,
    type: z.literal("gifts"),
    title: z.string(),
    text: z.string().default(""),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  }),
  z.object({ ...base, type: z.literal("gallery"), title: z.string(), images: z.array(z.string()).default([]) }),
  z.object({
    ...base,
    type: z.literal("faq"),
    title: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
  z.object({ ...base, type: z.literal("rsvp"), title: z.string(), text: z.string().default("") }),
]);

export const sectionsSchema = z.array(sectionSchema);
export type SiteSection = z.infer<typeof sectionSchema>;
export type SectionType = SiteSection["type"];

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Cover",
  countdown: "Countdown",
  text: "Text",
  schedule: "Schedule & venues",
  gifts: "Registry",
  gallery: "Gallery",
  faq: "FAQ",
  rsvp: "RSVP",
};

export function parseSections(raw: unknown): SiteSection[] {
  const r = sectionsSchema.safeParse(raw);
  return r.success ? r.data : [];
}
