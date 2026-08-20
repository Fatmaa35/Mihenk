-- Productization: hybrid search, reversible actions, chat lifecycle, planner and operations.
create extension if not exists pg_trgm with schema extensions;

do $$ declare constraint_name text; begin
  select c.conname into constraint_name from pg_constraint c where c.conrelid='public.notifications'::regclass
    and c.contype='c' and pg_get_constraintdef(c.oid) like '%price_drop%';
  if constraint_name is not null then execute format('alter table public.notifications drop constraint %I',constraint_name); end if;
  alter table public.notifications add constraint notifications_kind_check check(kind in ('price_drop','reading_reminder'));
exception when duplicate_object then null;
end $$;

create index if not exists books_title_trgm_idx on public.books using gin (title extensions.gin_trgm_ops);
create index if not exists books_author_trgm_idx on public.books using gin (author extensions.gin_trgm_ops);
create index if not exists books_theme_search_idx on public.books using gin (themes);
-- books.search_document is an existing generated, weighted tsvector with a GIN index.

alter table public.chat_sessions add column if not exists is_pinned boolean not null default false;
alter table public.chat_sessions add column if not exists is_archived boolean not null default false;
alter table public.chat_messages add column if not exists citations jsonb not null default '[]'::jsonb;
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists deleted_at timestamptz;
create index if not exists chat_sessions_active_idx on public.chat_sessions(user_id,is_archived,is_pinned desc,updated_at desc);

alter table public.action_executions add column if not exists status text not null default 'succeeded';
alter table public.action_executions add column if not exists action_payload jsonb not null default '{}'::jsonb;
alter table public.action_executions add column if not exists inverse_action jsonb;
alter table public.action_executions add column if not exists error_code text;
alter table public.action_executions add column if not exists duration_ms integer not null default 0;
alter table public.action_executions add column if not exists undone_at timestamptz;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='action_executions_status_check') then
    alter table public.action_executions add constraint action_executions_status_check check(status in ('succeeded','failed','undone'));
  end if;
end $$;

alter table public.reading_plans add column if not exists reminder_time time not null default '20:00';
alter table public.reading_plans add column if not exists timezone text not null default 'Europe/Istanbul';
alter table public.reading_plans add column if not exists excluded_weekdays smallint[] not null default '{}';
alter table public.reading_plans add column if not exists weekday_pages integer;
alter table public.reading_plans add column if not exists weekend_pages integer;
alter table public.reading_plans add column if not exists delivery_channel text not null default 'in_app';
alter table public.reading_plans add column if not exists status text not null default 'active';
do $$ begin
  if not exists(select 1 from pg_constraint where conname='reading_plans_channel_check') then
    alter table public.reading_plans add constraint reading_plans_channel_check check(delivery_channel in ('in_app','email','push'));
    alter table public.reading_plans add constraint reading_plans_status_check check(status in ('active','paused','completed'));
    alter table public.reading_plans add constraint reading_plans_weekdays_check check(excluded_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]);
  end if;
end $$;

create table if not exists public.reading_plan_days (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  plan_date date not null, planned_pages integer not null check(planned_pages >= 0),
  completed_pages integer not null default 0 check(completed_pages >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,book_id,plan_date)
);
create index if not exists reading_plan_days_calendar_idx on public.reading_plan_days(user_id,plan_date);
create index if not exists reading_plan_days_book_idx on public.reading_plan_days(book_id);

create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  scheduled_for timestamptz not null, channel text not null check(channel in ('in_app','email','push')),
  status text not null default 'pending' check(status in ('pending','processing','sent','failed','dead_letter')),
  attempts smallint not null default 0, idempotency_key text not null unique,
  last_error text, sent_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists reminder_deliveries_due_idx on public.reminder_deliveries(scheduled_for) where status='pending';
create index if not exists reminder_deliveries_user_idx on public.reminder_deliveries(user_id);
create index if not exists reminder_deliveries_book_idx on public.reminder_deliveries(book_id);

create table if not exists public.feature_flags (
  key text primary key, description text not null default '', enabled boolean not null default false,
  rollout_percent smallint not null default 0 check(rollout_percent between 0 and 100), updated_at timestamptz not null default now()
);

alter table public.reading_plan_days enable row level security;
alter table public.reminder_deliveries enable row level security;
alter table public.feature_flags enable row level security;
drop policy if exists reading_plan_days_own on public.reading_plan_days;
create policy reading_plan_days_own on public.reading_plan_days for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy if exists reminder_deliveries_own_read on public.reminder_deliveries;
create policy reminder_deliveries_own_read on public.reminder_deliveries for select to authenticated using((select auth.uid())=user_id);
drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags for select to authenticated using(true);
revoke all on public.reminder_deliveries from anon,authenticated;
grant select on public.reminder_deliveries to authenticated;
grant all on public.reminder_deliveries to service_role;
grant select,insert,update,delete on public.reading_plan_days to authenticated;
grant all on public.reading_plan_days,public.feature_flags to service_role;
grant select on public.feature_flags to authenticated;

create or replace function public.search_books_hybrid(query_text text, query_embedding extensions.vector(768), match_count integer default 50)
returns table(book_id text,semantic_score real,lexical_score real,title_score real,author_score real,theme_score real)
language sql stable security invoker set search_path=''
as $$
  with q as (select websearch_to_tsquery('turkish',query_text) tsq), scored as (
    select b.id,
      case when query_embedding is null or b.embedding is null then 0 else 1-(b.embedding operator(extensions.<=>) query_embedding) end semantic,
      ts_rank_cd(b.search_document,q.tsq) lexical,
      greatest(extensions.similarity(b.title,query_text),case when b.title ilike '%'||query_text||'%' then 1 else 0 end) title_match,
      extensions.similarity(b.author,query_text) author_match,
      coalesce((select max(extensions.similarity(theme,query_text)) from unnest(b.themes) theme),0) theme_match
    from public.books b cross join q where b.is_recommendable
  )
  select id,semantic::real,lexical::real,title_match::real,author_match::real,theme_match::real from scored
  where semantic>0 or lexical>0 or title_match>.15 or author_match>.15 or theme_match>.15
  order by (.48*semantic+.27*lexical+.14*title_match+.07*author_match+.04*theme_match) desc,id
  limit least(greatest(match_count,1),100);
$$;
revoke execute on function public.search_books_hybrid(text,extensions.vector,integer) from public,anon;
grant execute on function public.search_books_hybrid(text,extensions.vector,integer) to authenticated,service_role;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_sessions') then
    alter publication supabase_realtime add table public.chat_sessions;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='reading_plan_days') then
    alter publication supabase_realtime add table public.reading_plan_days;
  end if;
end $$;
