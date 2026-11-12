# Celebra — event websites and planning platform

Multi-tenant SaaS for weddings, bar/bat mitzvahs, brit milah, quinceañeras and any celebration.
Every client gets:

- **Public event website** (`/{slug}`) with themes and editable sections — schedule, map, registry, gallery, FAQ — and a **personal RSVP link** per household (`/{slug}?i=TOKEN`): yes / no / maybe for each part of the event, plus-ones, dietary needs and custom questions.
- **Dashboard** (`/dashboard/{eventId}`): live overview; guests (manual entry, CSV/Excel import, inline editing, export); **email (Sender)** and **WhatsApp (Cloud API)** messages with per-guest status (sent → delivered → opened/read → replied), scheduled sends and automatic reminders; a **seating chart editor** (round 8/10/12, square, rectangle/banquet tables) with drag and drop, "together / apart" rules and printing.
- **Super admin** (`/admin`): create an event once the client pays, invite the owner by email, activate/archive, and set guest and message limits.

## Architecture

| Layer | Technology |
|---|---|
| App | Next.js 15 (App Router, Server Actions), TypeScript, Tailwind v4 |
| Data / auth | Supabase: Postgres + RLS, magic link, Storage (`event-assets`) |
| Messaging | `lib/messaging/*`: queue in the `messages` table, `claim_messages()` with `SKIP LOCKED`, cron every 5 min (`vercel.json`) |
| Tracking | Own open pixel `/api/t/o/:id`, click redirect `/api/t/c/:id`, webhooks `/api/webhooks/whatsapp` and `/api/webhooks/email` |
| Seating | `react-konva`; pure geometry and validation in `lib/seating/*` |

**Multi-tenant:** the tenant is the event. Every table has `event_id` and RLS (`is_event_member`, `can_edit_event`). Roles: `owner`, `editor`, `viewer` (`event_members`), plus super admins in `platform_admins`. Guests never sign in: their invitation token authorizes the RSVP, which the server writes with the service role after validation.

**Event types** (`lib/event-types.ts`): each type defines default moments and sections. Adding a new type = adding a preset (and the value to the `event_type` enum).

```
app/[slug]                  public website + RSVP
app/dashboard/[eventId]/*   overview, guests, messages, seating, site, settings
app/admin                   super admin
app/api/*                   cron, webhooks, tracking
lib/                        domain logic (pure, tested) + data access
supabase/migrations         schema + RLS
```

## Getting started

1. Create a Supabase project and apply the migrations:
   ```bash
   npx supabase init        # first time only (creates supabase/config.toml)
   npx supabase link --project-ref YOUR_REF
   npx supabase db push
   ```
2. In Supabase → Authentication → URL configuration, add `https://YOUR_DOMAIN/auth/callback` to Redirect URLs.
3. Copy `.env.example` to `.env.local` and fill it in.
4. Make yourself a super admin: log in once at `/login`, then in the Supabase SQL editor run:
   ```sql
   insert into platform_admins select id from auth.users where email = 'you@example.com';
   ```
5. `npm install && npm run dev`, open `/admin` and create the first event.

### WhatsApp (Cloud API)

1. In Meta for Developers, create a Business app with the WhatsApp product and register the platform phone number.
2. Create and get approval for a *Utility* template, e.g. `event_invitation` in `en_US`, whose body uses `{{1}}`, `{{2}}`… in the same order the variables appear in the Celebra template, with quick-reply buttons **Yes / No / Maybe** (payloads `RSVP_YES`, `RSVP_NO`, `RSVP_MAYBE`, or just the text).
3. Webhook: URL `https://YOUR_DOMAIN/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages`.
4. Replies update the guest's RSVP automatically; "STOP" unsubscribes them from WhatsApp.

### Email (Sender)

Set `SENDER_API_KEY` and a verified sender in `EMAIL_FROM`. Opens and clicks are measured with our own pixel and redirect. For delivery/bounce events, point the provider webhook at `https://YOUR_DOMAIN/api/webhooks/email?secret=CRON_SECRET`. Without `SENDER_API_KEY`, emails are only logged to the console (useful in development). To switch providers, implement `EmailProvider` (`lib/messaging/email-provider.ts`).

### Production (Vercel)

Deploy the repo, set the environment variables, and the cron in `vercel.json` will call `/api/cron/dispatch` every 5 minutes with `CRON_SECRET`.

## Tests

```bash
npm test            # unit tests (Vitest): RSVP, audiences, templates, statuses, webhooks, import, seating
npm run test:sql    # migrations + RLS against a local Postgres (PGHOST/PGPORT/PGUSER)
npm run typecheck && npm run lint && npm run build
```

## Roadmap

Stripe Checkout (payment → active event), QR check-in at the door, guest photo uploads via QR, budget and vendors, checklist, day-of timeline, Spanish and Hebrew/RTL, custom domains, the client's own WhatsApp number (Embedded Signup), a *planner* role across multiple events.
