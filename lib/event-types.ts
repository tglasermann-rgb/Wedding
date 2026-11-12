import type { EventType } from "./types";
import type { SiteSection } from "./site/schema";

export interface EventTypePreset {
  type: EventType;
  label: string;
  hostsLabel: string;
  defaultSessions: string[];
  defaultTheme: string;
  defaultSections: (ctx: { title: string; hosts: string }) => SiteSection[];
}

const baseSections = (heroTitle: string, heroSubtitle: string, extra: SiteSection[] = []): SiteSection[] => [
  { id: "hero", type: "hero", title: heroTitle, subtitle: heroSubtitle, imageUrl: "" },
  { id: "countdown", type: "countdown" },
  ...extra,
  { id: "schedule", type: "schedule", title: "Schedule" },
  { id: "rsvp", type: "rsvp", title: "RSVP", text: "We'd love to celebrate with you." },
  { id: "faq", type: "faq", title: "FAQ", items: [] },
];

export const EVENT_TYPES: Record<EventType, EventTypePreset> = {
  wedding: {
    type: "wedding",
    label: "Wedding",
    hostsLabel: "Couple",
    defaultSessions: ["Ceremony", "Reception"],
    defaultTheme: "classic",
    defaultSections: ({ hosts }) =>
      baseSections(hosts || "Our wedding", "We're getting married!", [
        { id: "story", type: "text", title: "Our story", body: "" },
        { id: "dress", type: "text", title: "Dress code", body: "Formal" },
        { id: "gifts", type: "gifts", title: "Registry", text: "", links: [] },
        { id: "gallery", type: "gallery", title: "Gallery", images: [] },
      ]),
  },
  bar_mitzvah: {
    type: "bar_mitzvah",
    label: "Bar Mitzvah",
    hostsLabel: "Family",
    defaultSessions: ["Torah Service", "Party"],
    defaultTheme: "modern",
    defaultSections: ({ title, hosts }) =>
      baseSections(title, hosts ? `With love, ${hosts}` : "Join us to celebrate", [
        { id: "about", type: "text", title: "About the celebration", body: "" },
        { id: "gallery", type: "gallery", title: "Gallery", images: [] },
      ]),
  },
  bat_mitzvah: {
    type: "bat_mitzvah",
    label: "Bat Mitzvah",
    hostsLabel: "Family",
    defaultSessions: ["Ceremony", "Party"],
    defaultTheme: "modern",
    defaultSections: ({ title, hosts }) =>
      baseSections(title, hosts ? `With love, ${hosts}` : "Join us to celebrate", [
        { id: "about", type: "text", title: "About the celebration", body: "" },
        { id: "gallery", type: "gallery", title: "Gallery", images: [] },
      ]),
  },
  brit_milah: {
    type: "brit_milah",
    label: "Brit Milah",
    hostsLabel: "Parents",
    defaultSessions: ["Brit Milah"],
    defaultTheme: "classic",
    defaultSections: ({ title, hosts }) =>
      baseSections(title, hosts ? `${hosts} invite you` : "You're invited", []),
  },
  quinceanera: {
    type: "quinceanera",
    label: "Quinceañera",
    hostsLabel: "Quinceañera",
    defaultSessions: ["Mass", "Party"],
    defaultTheme: "modern",
    defaultSections: ({ title, hosts }) =>
      baseSections(hosts || title, "My Quinceañera", [
        { id: "gifts", type: "gifts", title: "Registry", text: "", links: [] },
        { id: "gallery", type: "gallery", title: "Gallery", images: [] },
      ]),
  },
  generic: {
    type: "generic",
    label: "Event",
    hostsLabel: "Hosts",
    defaultSessions: ["Event"],
    defaultTheme: "classic",
    defaultSections: ({ title, hosts }) => baseSections(title, hosts || "", []),
  },
};

export const EVENT_TYPE_OPTIONS = Object.values(EVENT_TYPES).map((p) => ({ value: p.type, label: p.label }));
