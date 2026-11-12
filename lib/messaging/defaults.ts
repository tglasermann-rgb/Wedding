/** Starter templates created with every new event. */
export const DEFAULT_TEMPLATES = [
  {
    channel: "email" as const,
    name: "Invitación",
    subject: "{{hosts}} — ¡Estás invitado!",
    body: "Hola {{first_name}},\n\nCon mucha ilusión te invitamos a {{event_title}} el {{event_date}}.\n\nToda la información y la confirmación de asistencia están en nuestra página.",
  },
  {
    channel: "email" as const,
    name: "Recordatorio de confirmación",
    subject: "¿Nos acompañas? Confirma tu asistencia",
    body: "Hola {{first_name}},\n\nAún no recibimos tu confirmación para {{event_title}}. ¿Nos ayudas respondiendo en el siguiente enlace?",
  },
  {
    channel: "whatsapp" as const,
    name: "Invitación WhatsApp",
    subject: null,
    body: "Hola {{first_name}}, te invitamos a {{event_title}} el {{event_date}}. Confirma aquí: {{rsvp_link}}",
    wa_template_name: "invitacion_evento",
    wa_language: "es",
  },
];
