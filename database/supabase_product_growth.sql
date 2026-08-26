-- Product growth layer: onboarding, recommendation measurement and retention.
-- Apply after supabase_schema.sql and the existing productization migrations.

do $$ declare constraint_name text; begin
  select c.conname into constraint_name from pg_constraint c
  where c.conrelid='public.notifications'::regclass and c.contype='c'
    and pg_get_constraintdef(c.oid) like '%price_drop%';
  if constraint_name is not null then execute format('alter table public.notifications drop constraint %I',constraint_name); end if;
  alter table public.notifications add constraint notifications_kind_growth_check
    check(kind in ('price_drop','reading_reminder','comment_reply','comment_helpful','new_follower','badge_earned','edition_update'));
exception when duplicate_object then null;
end $$;

create table if not exists public.onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  liked_book_ids text[] not null default '{}',
  liked_authors text[] not null default '{}',
  onboarding_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_interactions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  book_id text references public.books(id) on delete set null,
  event_type text not null check(event_type in ('impression','click','library_add','reading_start','reading_finish','like','dislike')),
  position integer check(position is null or position > 0),
  experiment_variant text not null check(experiment_variant in ('catalog_control','ai_assisted')),
  query_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists recommendation_interactions_funnel_idx
  on public.recommendation_interactions(experiment_variant,event_type,created_at desc);
create index if not exists recommendation_interactions_user_idx
  on public.recommendation_interactions(user_id,created_at desc)
  where user_id is not null;
create index if not exists recommendation_interactions_recommendation_idx
  on public.recommendation_interactions(recommendation_id,position);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent_granted boolean not null default false,
  weekly_digest boolean not null default true,
  recommendations boolean not null default true,
  price_drops boolean not null default true,
  stock_updates boolean not null default false,
  social_updates boolean not null default true,
  frequency text not null default 'weekly' check(frequency in ('instant','daily','weekly','off')),
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default now()
);

create table if not exists public.edition_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  event_type text not null check(event_type in ('new_edition','back_in_stock')),
  is_active boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,book_id,event_type)
);
create index if not exists edition_subscriptions_active_idx
  on public.edition_subscriptions(book_id,event_type)
  where is_active;

create table if not exists public.reading_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 1 and 120),
  description text not null default '',
  visibility text not null default 'private' check(visibility in ('private','unlisted','public')),
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reading_lists_owner_idx on public.reading_lists(owner_id,updated_at desc);

create table if not exists public.reading_list_items (
  list_id uuid not null references public.reading_lists(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  note text not null default '',
  position integer not null default 1 check(position > 0),
  added_at timestamptz not null default now(),
  primary key(list_id,book_id)
);
create index if not exists reading_list_items_order_idx on public.reading_list_items(list_id,position,added_at);

create table if not exists public.book_clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 2 and 120),
  description text not null default '',
  visibility text not null default 'private' check(visibility in ('private','unlisted','public')),
  invite_code uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_club_members (
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key(club_id,user_id)
);
create index if not exists book_club_members_user_idx on public.book_club_members(user_id,joined_at desc);

create table if not exists public.book_club_reads (
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  start_date date,
  target_date date,
  status text not null default 'planned' check(status in ('planned','reading','completed')),
  created_at timestamptz not null default now(),
  primary key(club_id,book_id),
  check(target_date is null or start_date is null or target_date >= start_date)
);

alter table public.onboarding_profiles enable row level security;
alter table public.recommendation_interactions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.edition_subscriptions enable row level security;
alter table public.reading_lists enable row level security;
alter table public.reading_list_items enable row level security;
alter table public.book_clubs enable row level security;
alter table public.book_club_members enable row level security;
alter table public.book_club_reads enable row level security;

create policy onboarding_profiles_own on public.onboarding_profiles for all to authenticated
  using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy recommendation_interactions_own on public.recommendation_interactions for select to authenticated
  using((select auth.uid())=user_id);
create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy edition_subscriptions_own on public.edition_subscriptions for all to authenticated
  using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy reading_lists_own on public.reading_lists for all to authenticated
  using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy reading_list_items_owner on public.reading_list_items for all to authenticated
  using(exists(select 1 from public.reading_lists l where l.id=list_id and l.owner_id=(select auth.uid())))
  with check(exists(select 1 from public.reading_lists l where l.id=list_id and l.owner_id=(select auth.uid())));
create policy book_clubs_member_read on public.book_clubs for select to authenticated
  using(exists(select 1 from public.book_club_members m where m.club_id=id and m.user_id=(select auth.uid())));
create policy book_clubs_owner_write on public.book_clubs for all to authenticated
  using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy book_club_members_member_read on public.book_club_members for select to authenticated
  using(user_id=(select auth.uid()));
create policy book_club_reads_member_read on public.book_club_reads for select to authenticated
  using(exists(select 1 from public.book_club_members mine where mine.club_id=club_id and mine.user_id=(select auth.uid())));

revoke all on public.onboarding_profiles,public.recommendation_interactions,public.notification_preferences,
  public.edition_subscriptions,public.reading_lists,public.reading_list_items,public.book_clubs,
  public.book_club_members,public.book_club_reads from anon,authenticated;
grant select,insert,update,delete on public.onboarding_profiles,public.notification_preferences,
  public.edition_subscriptions,public.reading_lists,public.reading_list_items,public.book_clubs,
  public.book_club_members,public.book_club_reads to authenticated;
grant select on public.recommendation_interactions to authenticated;
grant all on public.onboarding_profiles,public.recommendation_interactions,public.notification_preferences,
  public.edition_subscriptions,public.reading_lists,public.reading_list_items,public.book_clubs,
  public.book_club_members,public.book_club_reads to service_role;
