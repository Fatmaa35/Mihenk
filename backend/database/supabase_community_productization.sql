-- Community productization: threaded discussions, helpful votes, reports, follows and notifications.
alter table public.book_comments add column if not exists parent_comment_id uuid
  references public.book_comments(id) on delete cascade;
create index if not exists book_comments_parent_idx
  on public.book_comments(parent_comment_id,created_at) where parent_comment_id is not null;

create table if not exists public.comment_helpful_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.book_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,comment_id)
);
create index if not exists comment_helpful_votes_comment_idx
  on public.comment_helpful_votes(comment_id,created_at desc);

create table if not exists public.comment_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.book_comments(id) on delete cascade,
  reason text not null check(reason in ('spam','harassment','spoiler','hate','misinformation','other')),
  details text check(details is null or char_length(details)<=500),
  status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  moderator_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,comment_id)
);
create index if not exists comment_reports_queue_idx on public.comment_reports(status,created_at desc);
create index if not exists comment_reports_comment_idx on public.comment_reports(comment_id);

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,followed_id),
  check(follower_id<>followed_id)
);
create index if not exists user_follows_followed_idx on public.user_follows(followed_id,created_at desc);

do $$ begin
  if exists(select 1 from pg_constraint where conrelid='public.notifications'::regclass and contype='c'
            and pg_get_constraintdef(oid) ilike '%price_drop%') then
    execute (select 'alter table public.notifications drop constraint '||quote_ident(conname)
             from pg_constraint where conrelid='public.notifications'::regclass and contype='c'
             and pg_get_constraintdef(oid) ilike '%price_drop%' limit 1);
  end if;
end $$;
alter table public.notifications add constraint notifications_kind_check
  check(kind in ('price_drop','reading_reminder','comment_reply','comment_helpful','new_follower','badge_earned'));

alter table public.comment_helpful_votes enable row level security;
alter table public.comment_reports enable row level security;
alter table public.user_follows enable row level security;

create policy helpful_votes_read on public.comment_helpful_votes for select to authenticated using(true);
create policy helpful_votes_own_insert on public.comment_helpful_votes for insert to authenticated
  with check((select auth.uid())=user_id);
create policy helpful_votes_own_delete on public.comment_helpful_votes for delete to authenticated
  using((select auth.uid())=user_id);
create policy reports_own_select on public.comment_reports for select to authenticated
  using((select auth.uid())=user_id);
create policy reports_own_insert on public.comment_reports for insert to authenticated
  with check((select auth.uid())=user_id);
create policy reports_own_update on public.comment_reports for update to authenticated
  using((select auth.uid())=user_id) with check((select auth.uid())=user_id and status='open');
create policy follows_read on public.user_follows for select to authenticated
  using((select auth.uid())=follower_id or (select auth.uid())=followed_id);
create policy follows_own_insert on public.user_follows for insert to authenticated
  with check((select auth.uid())=follower_id);
create policy follows_own_delete on public.user_follows for delete to authenticated
  using((select auth.uid())=follower_id);

revoke all on public.comment_helpful_votes,public.comment_reports,public.user_follows from anon,authenticated;
grant select,insert,delete on public.comment_helpful_votes,public.user_follows to authenticated;
grant select,insert,update on public.comment_reports to authenticated;
grant all on public.comment_helpful_votes,public.comment_reports,public.user_follows to service_role;
grant usage,select on sequence public.comment_reports_id_seq to authenticated,service_role;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
