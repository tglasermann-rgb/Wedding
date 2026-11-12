/** Starter templates created with every new event. */
export const DEFAULT_TEMPLATES = [
  {
    channel: "email" as const,
    name: "Invitation",
    subject: "{{hosts}} — You're invited!",
    body: "Hi {{first_name}},\n\nWe would love for you to join us at {{event_title}} on {{event_date}}.\n\nAll the details, and your personal RSVP, are on our website.",
  },
  {
    channel: "email" as const,
    name: "RSVP reminder",
    subject: "Will you join us? Please RSVP",
    body: "Hi {{first_name}},\n\nWe haven't received your RSVP for {{event_title}} yet. Could you let us know using the link below?",
  },
  {
    channel: "whatsapp" as const,
    name: "WhatsApp invitation",
    subject: null,
    body: "Hi {{first_name}}, you're invited to {{event_title}} on {{event_date}}. RSVP here: {{rsvp_link}}",
    wa_template_name: "event_invitation",
    wa_language: "en_US",
  },
];
