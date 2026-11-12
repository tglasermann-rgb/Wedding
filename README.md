# Celebra

**Gather everyone you love.** Celebra is a multi-event SaaS for weddings, bar and bat mitzvahs, brit milahs, quinceañeras and every other celebration. Each client gets:

- A **public event website** (`/{slug}`) with themes and editable sections: schedule, map, registry, gallery, FAQ, and an **RSVP with a personal link** per household (`/{slug}?i=TOKEN`): yes / no / maybe for each part of the day, plus-ones, dietary needs and custom questions.
- A **dashboard** (`/dashboard/{eventId}`): live overview; guests (add by hand, CSV/Excel import, inline editing, export); messages by **email (Sender)** and **WhatsApp (Cloud API)** with per-guest status (sent → delivered → opened/read → replied), scheduled sends and automatic reminders; an optional **seating editor** (round tables of 8/10/12, square, banquet) with drag and drop, "keep together / keep apart" rules and printing.
- A **super-admin** (`/admin`) to create an event once the client pays, invite the owner by email, activate/archive events and set guest and message limits.

## Brand

Route A, "The Table": a circle of people seen from above. Nine dots gather into a C; the marigold dot is the guest who just said yes.

| Token | Hex | Use |
|---|---|---|
| Aubergine | `#2E1F3A` | Text, logo, primary buttons |
| Marigold | `#F29E38` | The "yes" dot, accents, secondary CTA |
| Blush | `#F4D6CF` | Tags, soft fills |
| Olive | `#6B7F5A` | Attending / success |
| Linen | `#FAF5EF` | Page background |

Type: **Bricolage Grotesque** for headings (`font-display`), **Figtree** for text and UI (`font-sans`). Voice: warm, calm, hospitable.

- Tokens live in `app/globals.css`. Tailwind's `stone` and `emerald` ramps are re-tinted to the brand, so existing utilities follow it.
- Logo component: `components/brand/logo.tsx` (`<Logo />`, `<Mark />`, variants `color` / `inverse` / `mono`).
- SVG files: `public/brand/*` and the favicon at `app/icon.svg`.
- Event websites keep their own themes (`lib/site/themes.ts`); Celebra appears only as a small "Made with Celebra" footer.

## Architecture

| Layer | Technology |
|---|---|
| App | Next.js 15 (App Router, Server Actions), TypeScript, Tailwind v4 |
| Data / auth | Supabase: Postgres + RLS, magic link, Storage (`event-assets`) |
| Messaging | `lib/messaging/*`: queue in the `messages` table, `claim_messages()` with `SKIP LOCKED`, cron every 5 min (`vercel.json`) |
| Tracking | Own pixel `/api/t/o/:id`, click redirect `/api/t/c/:id`, webhooks `/api/webhooks/whatsapp` and `/api/webhooks/email` |
| Seating | `react-konva`; pure geometry and validation in `lib/seating/*` |

**Multi-tenant:** the tenant is the event. Every table has `event_id` and RLS (`is_event_member`, `can_edit_event`). Roles: `owner`, `editor`, `viewer` (`event_members`), plus super-admins in `platform_admins`. Guests never authenticate: their invitation token authorizes the RSVP, which the server writes with the service role after validation.

**Event types** (`lib/event-types.ts`): each type defines default sessions and sections. Adding a type = adding a preset (and the value to the `event_type` enum).

```
app/[slug]                  public event website + RSVP
app/dashboard/[eventId]/*   resumen, guests, messages, seating, site, settings
app/admin                   super-admin
app/api/*                   cron, webhooks, tracking
lib/                        domain logic (pure and tested) + data access
supabase/migrations         schema + RLS
```

## Getting started

1. Create a Supabase project and apply the migrations:
   ```bash
   npx supabase init        # first time only (creates supabase/config.toml)
   npx supabase link --project-ref YOUR_REF
   npx supabase db push
   ```
2. In Supabase → Authentication → URL configuration, add `https://YOUR_DOMAIN/auth/callback` to the Redirect URLs.
3. Copy `.env.example` to `.env.local` and fill it in.
4. Make yourself super-admin: log in once at `/login` with your email, then in the Supabase SQL editor:
   ```sql
   insert into platform_admins select id from auth.users where email = 'you@example.com';
   ```
5. `npm install && npm run dev`, open `/admin` and create the first event.

### WhatsApp (Cloud API)

1. In Meta for Developers, create a Business app with the WhatsApp product and register the platform's number.
2. Create and get approval for a template (category *Utility*), e.g. `event_invitation` in `en_US`, with a body using `{{1}}`, `{{2}}`… in the same order the variables appear in the Celebra template, and quick-reply buttons **Yes / No / Maybe** (payloads `RSVP_YES`, `RSVP_NO`, `RSVP_MAYBE`, or just the text).
3. Webhook: URL `https://YOUR_DOMAIN/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages`.
4. Replies update the guest's RSVP automatically; "STOP" unsubscribes them from WhatsApp. Spanish replies ("sí", "no", "tal vez", "baja") are still understood.

### Email (Sender)

Set `SENDER_API_KEY` and a verified sender in `EMAIL_FROM`. Opens and clicks are measured with our pixel and redirect. For deliveries/bounces, point the provider's webhook at `https://YOUR_DOMAIN/api/webhooks/email?secret=CRON_SECRET`. Without `SENDER_API_KEY`, emails are only logged to the console (useful in development). Switching providers = implementing `EmailProvider` (`lib/messaging/email-provider.ts`).

### Production (Vercel)

Deploy the repo, set the environment variables, and the cron in `vercel.json` will call `/api/cron/dispatch` every 5 minutes with `CRON_SECRET`.

## Tests

```bash
npm test            # unit (Vitest): RSVP, audiences, templates, statuses, webhooks, import, seating
npm run test:sql    # migrations + RLS against a local Postgres (PGHOST/PGPORT/PGUSER)
npm run typecheck && npm run lint && npm run build
```

## Roadmap

Stripe Checkout (payment → active event), QR check-in at the door, guest photo uploads by QR, budget and vendors, checklist, day-of timeline, Spanish and Hebrew/RTL, custom domains, the client's own WhatsApp number (Embedded Signup), a *planner* role with multiple events.
