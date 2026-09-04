begin;

-- New public objects are private by default. Every Data API exposure must be
-- an explicit, reviewable GRANT in the same migration as its RLS policies.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'session_started', 'view_opened', 'onboarding_started',
    'onboarding_completed', 'notification_opt_in', 'feedback_submitted'
  )),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (pg_column_size(properties) <= 8192)
);
create index if not exists product_events_user_time_idx
  on public.product_events(user_id, occurred_at desc);
create index if not exists product_events_name_time_idx
  on public.product_events(event_name, occurred_at desc);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug', 'idea', 'usability', 'content', 'other')),
  rating smallint check (rating between 0 and 10),
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_column_size(context) <= 8192)
);
create index if not exists beta_feedback_status_time_idx
  on public.beta_feedback(status, created_at desc);
create index if not exists beta_feedback_user_time_idx
  on public.beta_feedback(user_id, created_at desc);

alter table public.product_events enable row level security;
alter table public.beta_feedback enable row level security;

revoke all on public.product_events, public.beta_feedback from anon, authenticated;
grant select, insert on public.beta_feedback to authenticated;
grant all on public.product_events, public.beta_feedback to service_role;
grant usage, select on sequence public.product_events_id_seq to service_role;

create policy beta_feedback_own_select on public.beta_feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy beta_feedback_own_insert on public.beta_feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'new');
create policy product_events_backend_only on public.product_events
  for all to service_role using (true) with check (true);

commit;
