-- Professional foundation: RBAC, audit, idempotent actions and catalog operations.

alter table public.profiles add column if not exists app_role text not null default 'user';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_app_role_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_app_role_check check (app_role in ('user','editor','admin'));
  end if;
end $$;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id text,
  before_data jsonb, after_data jsonb, request_id text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log(actor_user_id,created_at desc) where actor_user_id is not null;

create table if not exists public.action_executions (
  idempotency_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null, result jsonb not null,
  created_at timestamptz not null default now(),
  check (char_length(idempotency_key) between 16 and 100)
);
create index if not exists action_executions_user_idx on public.action_executions(user_id,created_at desc);

create table if not exists public.catalog_review_items (
  id uuid primary key default gen_random_uuid(),
  book_id text references public.books(id) on delete cascade,
  issue_type text not null check (issue_type in ('missing_cover','duplicate','suspicious_metadata','source_conflict','missing_isbn')),
  severity text not null check (severity in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  details jsonb not null default '{}'::jsonb,
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), resolved_at timestamptz,
  unique(book_id,issue_type)
);
create index if not exists catalog_review_open_idx on public.catalog_review_items(status,severity,created_at);
create index if not exists catalog_review_assigned_idx on public.catalog_review_items(assigned_to) where assigned_to is not null;
create index if not exists catalog_review_resolved_by_idx on public.catalog_review_items(resolved_by) where resolved_by is not null;

create table if not exists public.catalog_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('google_books_import','open_library_import','metadata_refresh','quality_scan')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','dead_letter')),
  attempts smallint not null default 0 check (attempts >= 0),
  max_attempts smallint not null default 3 check (max_attempts between 1 and 10),
  last_error text, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz
);
create index if not exists catalog_jobs_pending_idx on public.catalog_jobs(created_at) where status='pending';
create index if not exists catalog_jobs_creator_idx on public.catalog_jobs(created_by,created_at desc) where created_by is not null;

create table if not exists public.book_field_sources (
  book_id text not null references public.books(id) on delete cascade,
  field_name text not null, source_name text not null, source_url text,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  observed_value jsonb, observed_at timestamptz not null default now(),
  primary key(book_id,field_name,source_name)
);

alter table public.audit_log enable row level security;
alter table public.action_executions enable row level security;
alter table public.catalog_review_items enable row level security;
alter table public.catalog_jobs enable row level security;
alter table public.book_field_sources enable row level security;

revoke all on public.audit_log,public.action_executions,public.catalog_review_items,public.catalog_jobs,public.book_field_sources from anon,authenticated;
grant all on public.audit_log,public.action_executions,public.catalog_review_items,public.catalog_jobs,public.book_field_sources to service_role;
grant select on public.book_field_sources to anon,authenticated;
drop policy if exists book_field_sources_public_read on public.book_field_sources;
create policy book_field_sources_public_read on public.book_field_sources for select to anon,authenticated using (true);

-- A signed-in user may only update safe profile fields, never app_role.
revoke update on public.profiles from authenticated;
grant update(display_name,updated_at) on public.profiles to authenticated;

create or replace function public.catalog_merge_books(source_book_id text,target_book_id text,actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare caller_role text;
begin
  select p.app_role into caller_role from public.profiles p where p.id=actor_user_id;
  if caller_role not in ('editor','admin') then raise exception 'insufficient privilege'; end if;
  if source_book_id=target_book_id then raise exception 'source and target must differ'; end if;
  if not exists(select 1 from public.books where id=source_book_id) or not exists(select 1 from public.books where id=target_book_id) then
    raise exception 'book not found';
  end if;
  insert into public.user_books(user_id,book_id,shelf,is_favorite,current_page,total_pages,started_at,finished_at,abandonment_reason,updated_at)
    select user_id,target_book_id,shelf,is_favorite,current_page,total_pages,started_at,finished_at,abandonment_reason,updated_at
    from public.user_books where book_id=source_book_id on conflict do nothing;
  delete from public.user_books where book_id=source_book_id;
  insert into public.reading_plans(user_id,book_id,target_date,daily_pages,reminder_enabled,updated_at)
    select user_id,target_book_id,target_date,daily_pages,reminder_enabled,updated_at from public.reading_plans where book_id=source_book_id on conflict do nothing;
  delete from public.reading_plans where book_id=source_book_id;
  insert into public.price_alerts(user_id,book_id,target_price_minor,currency,is_active,last_notified_price_minor,created_at,updated_at)
    select user_id,target_book_id,target_price_minor,currency,is_active,last_notified_price_minor,created_at,updated_at from public.price_alerts where book_id=source_book_id on conflict do nothing;
  delete from public.price_alerts where book_id=source_book_id;
  update public.editions set book_id=target_book_id where book_id=source_book_id;
  update public.reading_activity set book_id=target_book_id where book_id=source_book_id;
  update public.notifications set book_id=target_book_id where book_id=source_book_id;
  update public.catalog_review_items set book_id=target_book_id where book_id=source_book_id and not exists(
    select 1 from public.catalog_review_items other where other.book_id=target_book_id and other.issue_type=public.catalog_review_items.issue_type
  );
  delete from public.catalog_review_items where book_id=source_book_id;
  delete from public.recommendation_feedback where book_id=source_book_id;
  delete from public.books where id=source_book_id;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,before_data,after_data)
    values(actor_user_id,'catalog.book.merge','book',target_book_id,jsonb_build_object('source',source_book_id),jsonb_build_object('target',target_book_id));
  return jsonb_build_object('source_book_id',source_book_id,'target_book_id',target_book_id,'merged',true);
end $$;
revoke execute on function public.catalog_merge_books(text,text,uuid) from public,anon,authenticated;
grant execute on function public.catalog_merge_books(text,text,uuid) to service_role;

create policy action_executions_service on public.action_executions for all to service_role using (true) with check (true);
create policy audit_log_service on public.audit_log for all to service_role using (true) with check (true);
create policy catalog_review_service on public.catalog_review_items for all to service_role using (true) with check (true);
create policy catalog_jobs_service on public.catalog_jobs for all to service_role using (true) with check (true);

create or replace function public.claim_catalog_job()
returns setof public.catalog_jobs language sql security definer set search_path=''
as $$
  update public.catalog_jobs set status='processing',attempts=attempts+1,started_at=now(),last_error=null
  where id=(select id from public.catalog_jobs where status='pending' order by created_at for update skip locked limit 1)
  returning *;
$$;
revoke execute on function public.claim_catalog_job() from public,anon,authenticated;
grant execute on function public.claim_catalog_job() to service_role;
