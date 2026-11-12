-- =============================================================
-- Core multi-tenant schema. Tenant unit = event.
-- Every tenant table carries event_id and is protected by RLS.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type event_type as enum ('wedding','bar_mitzvah','bat_mitzvah','brit_milah','quinceanera','generic');
create type event_status as enum ('draft','active','archived');
create type member_role as enum ('owner','editor','viewer');
create type rsvp_status as enum ('pending','yes','no','maybe');
create type rsvp_channel as enum ('web','whatsapp','email','admin');
create type message_channel as enum ('email','whatsapp');
create type message_status as enum ('queued','sending','sent','delivered','opened','read','clicked','replied','failed','bounced','skipped');
create type campaign_status as enum ('draft','scheduled','sending','done','cancelled');
create type table_shape as enum ('round','square','rect');
create type constraint_kind as enum ('together','apart');

-- ---------- Platform ----------
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])$'),
  type event_type not null default 'wedding',
  title text not null,
  hosts text,                                   -- "Ana & Daniel"
  event_date date,
  timezone text not null default 'America/Mexico_City',
  locale text not null default 'es',
  status event_status not null default 'draft',
  rsvp_deadline date,
  limits jsonb not null default '{"max_guests":300,"max_messages":2000}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_members (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index on event_members(user_id);

-- Pending invitations for people who do not have an account yet.
create table event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  email text not null,
  role member_role not null default 'owner',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

-- ---------- Helper functions (security definer, used by RLS) ----------
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function event_role(eid uuid) returns member_role
language sql stable security definer set search_path = public as $$
  select role from event_members where event_id = eid and user_id = auth.uid();
$$;

create or replace function is_event_member(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin() or exists (
    select 1 from event_members where event_id = eid and user_id = auth.uid());
$$;

create or replace function can_edit_event(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin() or exists (
    select 1 from event_members where event_id = eid and user_id = auth.uid()
      and role in ('owner','editor'));
$$;

-- When a user signs in, convert pending invites for their email into memberships.
create or replace function accept_pending_invites() returns void
language plpgsql security definer set search_path = public as $$
declare uemail text;
begin
  select email into uemail from auth.users where id = auth.uid();
  if uemail is null then return; end if;
  insert into event_members(event_id, user_id, role)
    select event_id, auth.uid(), role from event_invites
    where lower(email) = lower(uemail) and accepted_at is null
  on conflict do nothing;
  update event_invites set accepted_at = now()
    where lower(email) = lower(uemail) and accepted_at is null;
end $$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger events_touch before update on events for each row execute function touch_updated_at();

-- ---------- Event content ----------
create table event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,                       -- "Ceremonia", "Recepción"
  starts_at timestamptz,
  venue_name text,
  address text,
  map_url text,
  sort int not null default 0
);
create index on event_sessions(event_id);

create table event_sites (
  event_id uuid primary key references events(id) on delete cascade,
  theme_id text not null default 'classic',
  sections jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- Guests ----------
create table households (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,                        -- "Familia Pérez"
  token text not null unique default encode(gen_random_bytes(12), 'hex'),
  max_plus_ones int not null default 0,
  side text,                                 -- "novia" | "novio" | free text
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index on households(event_id);

create table guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  phone text,                                -- E.164
  locale text,
  is_child boolean not null default false,
  is_plus_one boolean not null default false,
  dietary text,
  notes text,
  email_opt_out boolean not null default false,
  whatsapp_opt_out boolean not null default false,
  created_at timestamptz not null default now()
);
create index on guests(event_id);
create index on guests(household_id);
create index on guests(phone);

create table rsvp_responses (
  guest_id uuid not null references guests(id) on delete cascade,
  session_id uuid not null references event_sessions(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status rsvp_status not null default 'pending',
  channel rsvp_channel,
  responded_at timestamptz,
  primary key (guest_id, session_id)
);
create index on rsvp_responses(event_id);

create table rsvp_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  kind text not null default 'text' check (kind in ('text','select')),
  options text[] not null default '{}',
  per_guest boolean not null default true,
  sort int not null default 0
);

create table rsvp_answers (
  question_id uuid not null references rsvp_questions(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  value text,
  primary key (question_id, guest_id)
);

-- ---------- Messaging ----------
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  channel message_channel not null,
  name text not null,
  subject text,                     -- email only
  body text not null,               -- supports {{first_name}}, {{rsvp_link}}, ...
  wa_template_name text,            -- WhatsApp: approved Meta template name
  wa_language text default 'es',
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  template_id uuid not null references message_templates(id) on delete restrict,
  name text not null,
  audience jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  status campaign_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table automations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  template_id uuid not null references message_templates(id) on delete cascade,
  name text not null,
  days_before int not null,          -- run N days before event_date
  audience jsonb not null default '{"rsvp":["pending"]}'::jsonb,
  enabled boolean not null default true,
  last_run_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  automation_id uuid references automations(id) on delete set null,
  channel message_channel not null,
  to_address text not null,
  subject text,
  body text,
  template_id uuid references message_templates(id) on delete set null,
  status message_status not null default 'queued',
  provider_message_id text,
  error text,
  attempts int not null default 0,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  updated_at timestamptz not null default now()
);
create index on messages(event_id);
create index on messages(status) where status = 'queued';
create index on messages(provider_message_id);
create trigger messages_touch before update on messages for each row execute function touch_updated_at();

create table message_events (
  id bigserial primary key,
  message_id uuid references messages(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  kind text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Claim a batch of queued messages for the dispatcher (concurrency-safe).
create or replace function claim_messages(batch int) returns setof messages
language sql security definer set search_path = public as $$
  update messages set status = 'sending', attempts = attempts + 1
  where id in (
    select id from messages where status = 'queued'
    order by queued_at limit batch for update skip locked)
  returning *;
$$;
revoke execute on function claim_messages(int) from public, anon, authenticated;

-- ---------- Seating ----------
create table venue_layouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null default 'Salón',
  width int not null default 1600,
  height int not null default 1000,
  created_at timestamptz not null default now()
);

create table seating_tables (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references venue_layouts(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  shape table_shape not null default 'round',
  capacity int not null check (capacity between 1 and 40),
  x real not null default 100,
  y real not null default 100,
  rotation real not null default 0
);

create table seat_assignments (
  layout_id uuid not null references venue_layouts(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  table_id uuid not null references seating_tables(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  seat_index int,
  primary key (layout_id, guest_id)
);

create table seating_constraints (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  kind constraint_kind not null,
  guest_a uuid not null references guests(id) on delete cascade,
  guest_b uuid not null references guests(id) on delete cascade
);

-- =============================================================
-- RLS
-- =============================================================
alter table platform_admins enable row level security;
create policy "admins read self" on platform_admins for select using (user_id = auth.uid());

alter table events enable row level security;
create policy "members read" on events for select using (is_event_member(id));
create policy "editors update" on events for update using (can_edit_event(id));
create policy "admins insert" on events for insert with check (is_platform_admin());
create policy "admins delete" on events for delete using (is_platform_admin());

alter table event_members enable row level security;
create policy "members read" on event_members for select using (is_event_member(event_id));
create policy "admins write" on event_members for all using (is_platform_admin()) with check (is_platform_admin());

alter table event_invites enable row level security;
create policy "admins all" on event_invites for all using (is_platform_admin()) with check (is_platform_admin());

-- Standard tenant tables: members read, owners/editors write.
do $$
declare t text;
begin
  foreach t in array array['event_sessions','event_sites','households','guests','rsvp_responses',
    'rsvp_questions','rsvp_answers','message_templates','campaigns','automations','messages',
    'message_events','venue_layouts','seating_tables','seat_assignments','seating_constraints']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "members read" on %I for select using (is_event_member(event_id))', t);
    execute format('create policy "editors insert" on %I for insert with check (can_edit_event(event_id))', t);
    execute format('create policy "editors update" on %I for update using (can_edit_event(event_id)) with check (can_edit_event(event_id))', t);
    execute format('create policy "editors delete" on %I for delete using (can_edit_event(event_id))', t);
  end loop;
end $$;

-- Public guest access (landing + RSVP) never goes through anon RLS:
-- it is served by server code using the service role after validating
-- the event slug / household token.

-- Storage bucket for event photos (public read).
insert into storage.buckets (id, name, public) values ('event-assets','event-assets', true)
  on conflict (id) do nothing;
create policy "event assets editors write" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-assets' and can_edit_event(((storage.foldername(name))[1])::uuid));
create policy "event assets editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'event-assets' and can_edit_event(((storage.foldername(name))[1])::uuid));
