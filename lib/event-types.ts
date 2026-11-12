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
  { id: "schedule", type: "schedule", title: "Programa" },
  { id: "rsvp", type: "rsvp", title: "Confirma tu asistencia", text: "Nos encantaría contar contigo." },
  { id: "faq", type: "faq", title: "Preguntas frecuentes", items: [] },
];

export const EVENT_TYPES: Record<EventType, EventTypePreset> = {
  wedding: {
    type: "wedding",
    label: "Boda",
    hostsLabel: "Novios",
    defaultSessions: ["Ceremonia", "Recepción"],
    defaultTheme: "classic",
    defaultSections: ({ hosts }) =>
      baseSections(hosts || "Nuestra boda", "¡Nos casamos!", [
        { id: "story", type: "text", title: "Nuestra historia", body: "" },
        { id: "dress", type: "text", title: "Código de vestimenta", body: "Formal" },
        { id: "gifts", type: "gifts", title: "Mesa de regalos", text: "", links: [] },
        { id: "gallery", type: "gallery", title: "Galería", images: [] },
      ]),
  },
  bar_mitzvah: {
    type: "bar_mitzvah",
    label: "Bar Mitzvah",
    hostsLabel: "Familia",
    defaultSessions: ["Aliá a la Torá", "Fiesta"],
    defaultTheme: "modern",
    defaultSections: ({ title, hosts }) =>
      baseSections(title, hosts ? `Con cariño, ${hosts}` : "Te invitamos a celebrar", [
        { id: "about", type: "text", title: "Sobre la celebración", body: "" },
        { id: "gallery", type: "gallery", title: "Galería", images: [] },
      ]),
  },
  bat_mitzvah: {
    type: "bat_mitzvah",
    label: "Bat Mitzvah",
    hostsLabel: "Familia",
    defaultSessions: ["Ceremonia", "Fiesta"],
    defaultTheme: "modern",
    defaultSections: ({ title, hosts }) =>
      baseSections(title, hosts ? `Con cariño, ${hosts}` : "Te invitamos a celebrar", [
        { id: "about", type: "text", title: "Sobre la celebración", body: "" },
        { id: "gallery", type: "gallery", title: "Galería", images: [] },
      ]),
  },
  brit_milah: {
    type: "brit_milah",
    label: "Brit Milá",
    hostsLabel: "Padres",
    defaultSessions: ["Brit Milá"],
    defaultTheme: "classic",
    defaultSections: ({ title, hosts }) =>
      baseSections(title, hosts ? `${hosts} les invitan` : "Te invitamos", []),
  },
  quinceanera: {
    type: "quinceanera",
    label: "XV Años",
    hostsLabel: "Quinceañera",
    defaultSessions: ["Misa", "Fiesta"],
    defaultTheme: "modern",
    defaultSections: ({ title, hosts }) =>
      baseSections(hosts || title, "Mis XV años", [
        { id: "gifts", type: "gifts", title: "Regalos", text: "", links: [] },
        { id: "gallery", type: "gallery", title: "Galería", images: [] },
      ]),
  },
  generic: {
    type: "generic",
    label: "Evento",
    hostsLabel: "Anfitriones",
    defaultSessions: ["Evento"],
    defaultTheme: "classic",
    defaultSections: ({ title, hosts }) => baseSections(title, hosts || "", []),
  },
};

export const EVENT_TYPE_OPTIONS = Object.values(EVENT_TYPES).map((p) => ({ value: p.type, label: p.label }));
