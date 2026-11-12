-- RLS isolation tests. Run with scripts/test-sql.sh. Fails (raises) on first violation.
\set ON_ERROR_STOP on
\pset tuples_only on
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'ana@x.com'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@x.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@x.com');
insert into platform_admins values ('00000000-0000-0000-0000-0000000000ad');
insert into events (id, slug, title) values
  ('e0000000-0000-0000-0000-00000000000a', 'boda-ana', 'Boda Ana'),
  ('e0000000-0000-0000-0000-00000000000b', 'bar-beto', 'Bar Mitzvah Beto');
insert into event_invites (event_id, email) values ('e0000000-0000-0000-0000-00000000000a', 'ANA@x.com');
insert into event_members values ('e0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'viewer');
insert into households (id, event_id, name) values
  ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000a', 'Fam A'),
  ('a0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000b', 'Fam B');
insert into guests (event_id, household_id, first_name) values
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Invitado A'),
  ('e0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000b', 'Invitado B');

create function assert(cond boolean, msg text) returns void language plpgsql as
  $$ begin if not cond then raise exception 'ASSERT FAILED: %', msg; end if; end $$;
grant execute on function assert(boolean, text) to authenticated, anon;

-- anon sees nothing
set role anon;
select assert((select count(*) from events) = 0, 'anon cannot read events');
select assert((select count(*) from guests) = 0, 'anon cannot read guests');
reset role;

-- Ana: invite becomes membership, sees only her event
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select assert((select count(*) from events) = 0, 'before accepting invite Ana sees nothing');
select accept_pending_invites();
select assert((select count(*) from events) = 1, 'Ana sees exactly her event');
select assert((select count(*) from guests) = 1 and (select first_name from guests) = 'Invitado A', 'Ana sees only her guests');
insert into guests (event_id, household_id, first_name) values ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'Nuevo');
select assert((select count(*) from guests) = 2, 'owner can insert guests');
do $$ begin
  insert into guests (event_id, household_id, first_name) values ('e0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000b', 'Intruso');
  raise exception 'ASSERT FAILED: Ana inserted into another event';
exception when insufficient_privilege then null; end $$;
update guests set first_name = 'hack' where event_id = 'e0000000-0000-0000-0000-00000000000b';
do $$ begin
  insert into events (slug, title) values ('nuevo-evento', 'x');
  raise exception 'ASSERT FAILED: non-admin created an event';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform claim_messages(10);
  raise exception 'ASSERT FAILED: authenticated can call claim_messages';
exception when insufficient_privilege then null; end $$;
reset role;
select assert((select first_name from guests where event_id = 'e0000000-0000-0000-0000-00000000000b') = 'Invitado B', 'cross-tenant update had no effect');

-- Beto is a viewer: can read, cannot write
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select assert((select count(*) from guests) = 1, 'viewer reads own event');
do $$ begin
  insert into guests (event_id, household_id, first_name) values ('e0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000b', 'x');
  raise exception 'ASSERT FAILED: viewer inserted';
exception when insufficient_privilege then null; end $$;

-- Platform admin sees everything
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad';
select assert((select count(*) from events) = 2, 'admin sees all events');
insert into events (slug, title) values ('admin-creado', 'Creado por admin');
reset role;

-- Dispatcher queue claims each message once
insert into message_templates (id, event_id, channel, name, body) values
  ('70000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-00000000000a', 'email', 't', 'hola');
insert into messages (event_id, guest_id, channel, to_address, template_id)
  select event_id, id, 'email', 'a@x.com', '70000000-0000-0000-0000-000000000001' from guests where event_id = 'e0000000-0000-0000-0000-00000000000a';
select assert((select count(*) from claim_messages(1)) = 1, 'claims batch size');
select assert((select count(*) from claim_messages(10)) = 1, 'claims the remaining one');
select assert((select count(*) from claim_messages(10)) = 0, 'nothing left to claim');

select 'ALL RLS TESTS PASSED' as result;
