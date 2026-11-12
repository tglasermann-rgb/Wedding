# Celebra — plataforma de páginas y gestión de eventos

SaaS multi-evento para bodas, bar/bat mitzvah, brit milá, XV años y cualquier celebración.
Cada cliente obtiene:

- **Página pública** del evento (`/{slug}`) con temas, secciones editables, programa, mapa, regalos, galería, FAQ y **RSVP con link personal** por familia (`/{slug}?i=TOKEN`): sí / no / tal vez por cada momento del evento, acompañantes, dietas y preguntas propias.
- **Dashboard** (`/dashboard/{eventId}`): resumen en vivo, invitados (alta manual, importación CSV/Excel, edición en línea, exportación), mensajes por **email (Sender)** y **WhatsApp (Cloud API)** con estado por invitado (enviado → entregado → abierto/leído → respondió), envíos programados y recordatorios automáticos, **editor de mesas** (redondas 8/10/12, cuadradas, rectangulares/imperiales) con arrastrar y soltar, reglas “juntos / separados” e impresión.
- **Super-admin** (`/admin`): crear el evento cuando el cliente paga, invitar al dueño por email, activar/archivar y fijar límites de invitados y mensajes.

## Arquitectura

| Capa | Tecnología |
|---|---|
| App | Next.js 15 (App Router, Server Actions), TypeScript, Tailwind v4 |
| Datos / auth | Supabase: Postgres + RLS, magic link, Storage (`event-assets`) |
| Mensajes | `lib/messaging/*`: cola en la tabla `messages`, `claim_messages()` con `SKIP LOCKED`, cron cada 5 min (`vercel.json`) |
| Tracking | Pixel propio `/api/t/o/:id`, redirect de clicks `/api/t/c/:id`, webhooks `/api/webhooks/whatsapp` y `/api/webhooks/email` |
| Mesas | `react-konva`; geometría y validaciones puras en `lib/seating/*` |

**Multi-tenant:** el tenant es el evento. Todas las tablas tienen `event_id` y RLS (`is_event_member`, `can_edit_event`). Roles: `owner`, `editor`, `viewer` (`event_members`), y super-admins en `platform_admins`. Los invitados nunca se autentican: el token de su invitación autoriza el RSVP, que se escribe desde el servidor con la service role tras validar.

**Tipos de evento** (`lib/event-types.ts`): cada tipo define momentos y secciones por defecto. Agregar un tipo nuevo = agregar un preset (y el valor al enum `event_type`).

```
app/[slug]                  página pública + RSVP
app/dashboard/[eventId]/*   resumen, guests, messages, seating, site, settings
app/admin                   super-admin
app/api/*                   cron, webhooks, tracking
lib/                        lógica de dominio (pura y testeada) + acceso a datos
supabase/migrations         esquema + RLS
```

## Puesta en marcha

1. Crea un proyecto en Supabase y aplica la migración:
   ```bash
   npx supabase init        # solo la primera vez (crea supabase/config.toml)
   npx supabase link --project-ref TU_REF
   npx supabase db push
   ```
2. En Supabase → Authentication → URL configuration, agrega `https://TU_DOMINIO/auth/callback` a las Redirect URLs.
3. Copia `.env.example` a `.env.local` y complétalo.
4. Hazte super-admin: entra una vez en `/login` con tu email y luego, en el SQL editor de Supabase:
   ```sql
   insert into platform_admins select id from auth.users where email = 'tu@email.com';
   ```
5. `npm install && npm run dev`, abre `/admin` y crea el primer evento.

### WhatsApp (Cloud API)

1. En Meta for Developers crea una app de tipo Business con el producto WhatsApp, y registra el número de la plataforma.
2. Crea y aprueba una plantilla (categoría *Utility*), p. ej. `invitacion_evento` en `es`, con cuerpo usando `{{1}}`, `{{2}}`… en el mismo orden en que aparecen las variables en la plantilla de Celebra, y botones de respuesta rápida **Sí / No / Tal vez** (payloads `RSVP_YES`, `RSVP_NO`, `RSVP_MAYBE` o simplemente el texto).
3. Webhook: URL `https://TU_DOMINIO/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, suscríbete a `messages`.
4. Las respuestas actualizan el RSVP del invitado automáticamente; “STOP” lo da de baja de WhatsApp.

### Email (Sender)

Configura `SENDER_API_KEY` y un remitente verificado en `EMAIL_FROM`. Aperturas y clicks se miden con nuestro pixel y redirect. Para entregas/rebotes, apunta el webhook del proveedor a `https://TU_DOMINIO/api/webhooks/email?secret=CRON_SECRET`. Sin `SENDER_API_KEY` los correos solo se registran en consola (útil en desarrollo). Cambiar de proveedor = implementar `EmailProvider` (`lib/messaging/email-provider.ts`).

### Producción (Vercel)

Despliega el repo, define las variables de entorno y el cron de `vercel.json` llamará a `/api/cron/dispatch` cada 5 minutos con `CRON_SECRET`.

## Tests

```bash
npm test            # unitarios (Vitest): RSVP, audiencias, plantillas, estados, webhooks, importación, mesas
npm run test:sql    # migraciones + RLS contra un Postgres local (PGHOST/PGPORT/PGUSER)
npm run typecheck && npm run lint && npm run build
```

## Roadmap

Stripe Checkout (pago → evento activo), check-in con QR en la puerta, fotos de invitados por QR, presupuesto y proveedores, checklist, timeline del día, hebreo/RTL e inglés, dominios propios, número de WhatsApp propio del cliente (Embedded Signup), rol *planner* con varios eventos.
