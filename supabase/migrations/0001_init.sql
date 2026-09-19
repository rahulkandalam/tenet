-- Tenet v2 · initial schema
-- Paste into Supabase → SQL Editor and run once. Safe to re-run: every object is created only if missing.

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  timezone text not null default 'Asia/Kolkata',
  daily_limit integer not null default 50 check (daily_limit between 0 and 1000),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration.
insert into public.profiles (id, full_name)
select id, raw_user_meta_data ->> 'full_name' from auth.users
on conflict (id) do nothing;

-- ───────────────────────── rulebooks + rules ─────────────────────────
create table if not exists public.rulebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version integer not null,
  source text not null check (source in ('upload', 'manual')),
  source_filename text,
  raw_text text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);
create unique index if not exists rulebooks_one_active on public.rulebooks (user_id) where is_active;

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  rulebook_id uuid not null references public.rulebooks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null,
  code text not null,                         -- R1, R2 … cited in every verdict
  section text not null check (section in ('qualifying', 'entry', 'exit', 'risk', 'soft')),
  kind text not null check (kind in ('hard', 'soft')),
  body text not null check (length(body) between 1 and 1000),
  unique (rulebook_id, code)
);
create index if not exists rules_rulebook on public.rules (rulebook_id, position);

-- Saves a new rulebook version atomically and makes it the active one.
-- p_rules: [{ "section": "entry", "kind": "hard", "body": "…" }, …] in display order.
create or replace function public.save_rulebook(
  p_source text, p_source_filename text, p_raw_text text, p_rules jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_version integer;
  v_id uuid;
  v_rule jsonb;
  v_pos integer := 0;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0 then
    raise exception 'a rulebook needs at least one rule';
  end if;
  if not exists (select 1 from jsonb_array_elements(p_rules) r where r ->> 'section' = 'qualifying')
     or not exists (select 1 from jsonb_array_elements(p_rules) r where r ->> 'section' = 'entry')
     or not exists (select 1 from jsonb_array_elements(p_rules) r where r ->> 'section' = 'exit') then
    raise exception 'qualifying, entry and exit each need at least one rule';
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.rulebooks where user_id = v_user;
  update public.rulebooks set is_active = false where user_id = v_user and is_active;
  insert into public.rulebooks (user_id, version, source, source_filename, raw_text, is_active)
  values (v_user, v_version, p_source, p_source_filename, p_raw_text, true)
  returning id into v_id;

  for v_rule in select * from jsonb_array_elements(p_rules) loop
    v_pos := v_pos + 1;
    insert into public.rules (rulebook_id, user_id, position, code, section, kind, body)
    values (v_id, v_user, v_pos, 'R' || v_pos, v_rule ->> 'section',
            coalesce(v_rule ->> 'kind', case when v_rule ->> 'section' = 'soft' then 'soft' else 'hard' end),
            trim(v_rule ->> 'body'));
  end loop;
  return v_id;
end;
$$;

-- ───────────────────────── checks ─────────────────────────
create table if not exists public.checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rulebook_id uuid not null references public.rulebooks (id),
  status text not null default 'open' check (status in ('open', 'complete')),
  verdict text check (verdict in ('GO AHEAD', 'PROCEED WITH CAUTION', 'NO GO', 'PROMPT')),
  summary text,
  closing_note text,
  extracted_plan jsonb,
  result jsonb,                               -- latest full model response
  model text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checks_user_created on public.checks (user_id, created_at desc);

create table if not exists public.check_messages (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists check_messages_check on public.check_messages (check_id, created_at);

create table if not exists public.rule_results (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null,
  rule_code text,
  label text not null,
  status text not null check (status in ('Passed', 'Failed', 'Cannot evaluate')),
  explanation text
);
create index if not exists rule_results_check on public.rule_results (check_id, position);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  check_id uuid primary key references public.checks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  decision text not null check (decision in ('taken', 'skipped', 'override')),
  note text,
  outcome_r numeric,                          -- next release
  decided_at timestamptz not null default now()
);

-- Server-counted usage. Users can read and add their own rows, never edit or delete them.
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('evaluate', 'transcribe', 'structure')),
  created_at timestamptz not null default now()
);
create index if not exists usage_user_time on public.usage_events (user_id, created_at desc);

-- Checks used today in the user's own time zone (drives the daily limit).
create or replace function public.usage_today(p_kind text) returns integer
language sql stable security invoker set search_path = '' as $$
  select count(*)::integer
  from public.usage_events e
  cross join lateral (
    select coalesce((select timezone from public.profiles where id = auth.uid()), 'Asia/Kolkata') as tz
  ) p
  where e.user_id = auth.uid()
    and e.kind = p_kind
    and e.created_at >= (date_trunc('day', now() at time zone p.tz) at time zone p.tz);
$$;

-- ───────────────────────── row-level security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.rulebooks enable row level security;
alter table public.rules enable row level security;
alter table public.checks enable row level security;
alter table public.check_messages enable row level security;
alter table public.rule_results enable row level security;
alter table public.attachments enable row level security;
alter table public.decisions enable row level security;
alter table public.usage_events enable row level security;

do $$
declare t text;
begin
  -- Full CRUD on your own rows.
  foreach t in array array['rulebooks', 'rules', 'checks', 'check_messages', 'rule_results', 'attachments', 'decisions'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "own usage read" on public.usage_events;
create policy "own usage read" on public.usage_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "own usage add" on public.usage_events;
create policy "own usage add" on public.usage_events for insert to authenticated with check ((select auth.uid()) = user_id);

-- daily_limit is set by the server, not the user: only name and time zone are editable.
revoke update on public.profiles from authenticated;
grant update (full_name, timezone) on public.profiles to authenticated;

-- ───────────────────────── chart storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('charts', 'charts', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "charts own folder" on storage.objects;
create policy "charts own folder" on storage.objects for all to authenticated
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'charts' and (storage.foldername(name))[1] = (select auth.uid())::text);
