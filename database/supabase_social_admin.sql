-- Social reading, verified profiles and operational dashboard.
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verification_label text;
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists banned_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists ban_reason text;
create index if not exists profiles_verified_by_idx on public.profiles(verified_by) where verified_by is not null;
create index if not exists profiles_banned_by_idx on public.profiles(banned_by) where banned_by is not null;

create or replace function private.protect_profile_admin_fields()
returns trigger language plpgsql security invoker set search_path=''
as $$ begin
  if current_user <> 'service_role'
     and (new.is_verified,new.verification_label,new.verified_at,new.verified_by,
          new.banned_at,new.banned_until,new.banned_by,new.ban_reason)
         is distinct from
         (old.is_verified,old.verification_label,old.verified_at,old.verified_by,
          old.banned_at,old.banned_until,old.banned_by,old.ban_reason) then
    raise exception 'Admin-owned profile fields cannot be changed by this role';
  end if;
  return new;
end $$;
revoke execute on function private.protect_profile_admin_fields() from public,anon,authenticated;
drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields before update on public.profiles
for each row execute function private.protect_profile_admin_fields();

alter table public.books add column if not exists rating_count integer not null default 0 check(rating_count >= 0);
alter table public.books add column if not exists rating_average numeric(3,2) not null default 0 check(rating_average between 0 and 5);
alter table public.books add column if not exists popularity_score numeric(5,4) not null default 0 check(popularity_score between 0 and 1);

create table if not exists public.book_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,book_id)
);
create index if not exists book_ratings_book_idx on public.book_ratings(book_id,updated_at desc);

create table if not exists public.book_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  content text not null check(char_length(btrim(content)) between 2 and 2000),
  contains_spoiler boolean not null default false,
  status text not null default 'published' check(status in ('published','hidden','removed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists book_comments_public_idx on public.book_comments(book_id,created_at desc) where status='published';
create index if not exists book_comments_user_idx on public.book_comments(user_id,created_at desc);

create table if not exists public.application_events (
  id bigint generated always as identity primary key,
  level text not null check(level in ('info','warning','error')),
  event_type text not null, request_id text, route text, status_code integer,
  duration_ms numeric(10,2), details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists application_events_recent_idx on public.application_events(created_at desc);
create index if not exists application_events_errors_idx on public.application_events(created_at desc) where level='error';

alter table public.book_ratings enable row level security;
alter table public.book_comments enable row level security;
alter table public.application_events enable row level security;
drop policy if exists book_ratings_public_read on public.book_ratings;
create policy book_ratings_public_read on public.book_ratings for select to anon,authenticated using(true);
drop policy if exists book_ratings_own_insert on public.book_ratings;
create policy book_ratings_own_insert on public.book_ratings for insert to authenticated with check((select auth.uid())=user_id);
drop policy if exists book_ratings_own_update on public.book_ratings;
create policy book_ratings_own_update on public.book_ratings for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy if exists book_ratings_own_delete on public.book_ratings;
create policy book_ratings_own_delete on public.book_ratings for delete to authenticated using((select auth.uid())=user_id);
drop policy if exists book_comments_public_read on public.book_comments;
create policy book_comments_public_read on public.book_comments for select to anon,authenticated using(status='published' or (select auth.uid())=user_id);
drop policy if exists book_comments_own_insert on public.book_comments;
create policy book_comments_own_insert on public.book_comments for insert to authenticated with check((select auth.uid())=user_id and status='published');
drop policy if exists book_comments_own_update on public.book_comments;
create policy book_comments_own_update on public.book_comments for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy if exists book_comments_own_delete on public.book_comments;
create policy book_comments_own_delete on public.book_comments for delete to authenticated using((select auth.uid())=user_id);
drop policy if exists application_events_service on public.application_events;
create policy application_events_service on public.application_events for all to service_role using(true) with check(true);

revoke all on public.book_ratings,public.book_comments,public.application_events from anon,authenticated;
grant select on public.book_ratings,public.book_comments to anon,authenticated;
grant insert,update,delete on public.book_ratings,public.book_comments to authenticated;
grant all on public.book_ratings,public.book_comments,public.application_events to service_role;

create or replace function private.refresh_book_social_score(target_book_id text)
returns void language sql security definer set search_path=''
as $$
  update public.books b set
    rating_count=s.rating_count,
    rating_average=s.rating_average,
    popularity_score=least(1, (ln(1+s.rating_count)/ln(101)) * (s.rating_average/5))
  from (select count(*)::integer rating_count,coalesce(round(avg(rating)::numeric,2),0) rating_average
        from public.book_ratings where book_id=target_book_id) s
  where b.id=target_book_id;
$$;
revoke execute on function private.refresh_book_social_score(text) from public,anon,authenticated;

create or replace function private.book_ratings_refresh_trigger()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
  perform private.refresh_book_social_score(coalesce(new.book_id,old.book_id));
  if tg_op='UPDATE' and new.book_id<>old.book_id then perform private.refresh_book_social_score(old.book_id); end if;
  return coalesce(new,old);
end $$;
revoke execute on function private.book_ratings_refresh_trigger() from public,anon,authenticated;
drop trigger if exists book_ratings_refresh_score on public.book_ratings;
create trigger book_ratings_refresh_score after insert or update or delete on public.book_ratings
for each row execute function private.book_ratings_refresh_trigger();

do $$ declare row record; begin
  for row in select id from public.books loop perform private.refresh_book_social_score(row.id); end loop;
end $$;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='book_comments') then
    alter publication supabase_realtime add table public.book_comments;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='book_ratings') then
    alter publication supabase_realtime add table public.book_ratings;
  end if;
end $$;
