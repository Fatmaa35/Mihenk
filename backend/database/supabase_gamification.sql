-- Mihenk achievements, XP progression and a three-slot profile showcase.
create table if not exists public.badge_definitions (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null,
  xp_reward integer not null check (xp_reward >= 0),
  sort_order integer not null unique,
  is_active boolean not null default true
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null references public.badge_definitions(code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_code)
);
create index if not exists user_badges_earned_idx on public.user_badges(user_id, earned_at desc);

create table if not exists public.user_badge_showcase (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  badge_code text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  unique (user_id, badge_code),
  foreign key (user_id, badge_code)
    references public.user_badges(user_id, badge_code) on delete cascade
);

insert into public.badge_definitions(code,name,description,icon,xp_reward,sort_order) values
('first_shelf','İlk Sayfa','İlk kitabını kitaplığına ekle.','📖',10,1),
('first_review','İlk İzlenim','İlk yayımlanmış yorumunu paylaş.','✍️',15,2),
('reader_5','Yolun Başında','Beş kitabı tamamla.','🌱',50,3),
('reader_25','Kitap Kurdu','Yirmi beş kitabı tamamla.','🐛',150,4),
('genre_explorer','Tür Kaşifi','Beş farklı türden kitap tamamla.','🧭',75,5),
('active_7','Düzenli Okur','Yedi farklı günde okuma ilerlemesi kaydet.','📅',40,6),
('streak_7','Okuma Serisi','Yedi günlük kesintisiz okuma serisine ulaş.','🔥',100,7),
('critic_10','Eleştirel Bakış','On yayımlanmış kitap yorumu paylaş.','🖋️',120,8),
('ratings_10','Topluluğun Sesi','On farklı kitabı yıldızla.','⭐',60,9),
('goal_getter','Hedef Tamam','Bir yıllık okuma hedefini tamamla.','🏆',100,10)
on conflict (code) do update set
  name=excluded.name, description=excluded.description, icon=excluded.icon,
  xp_reward=excluded.xp_reward, sort_order=excluded.sort_order, is_active=true;

alter table public.badge_definitions enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_badge_showcase enable row level security;

drop policy if exists badge_definitions_authenticated_read on public.badge_definitions;
create policy badge_definitions_authenticated_read on public.badge_definitions
for select to authenticated using (is_active);

drop policy if exists user_badges_authenticated_read on public.user_badges;
create policy user_badges_authenticated_read on public.user_badges
for select to authenticated using (true);

drop policy if exists user_badge_showcase_authenticated_read on public.user_badge_showcase;
create policy user_badge_showcase_authenticated_read on public.user_badge_showcase
for select to authenticated using (true);

revoke all on public.badge_definitions, public.user_badges, public.user_badge_showcase from anon, authenticated;
grant select on public.badge_definitions, public.user_badges, public.user_badge_showcase to authenticated;
grant all on public.badge_definitions, public.user_badges, public.user_badge_showcase to service_role;

create or replace function public.gamification_stats(target_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with activity_days as (
    select distinct ra.activity_date
    from public.reading_activity ra
    where ra.user_id = target_user_id
  ),
  streak_groups as (
    select activity_date,
           activity_date - (row_number() over (order by activity_date)::integer) as streak_group
    from activity_days
  ),
  streaks as (
    select count(*)::integer as streak_length
    from streak_groups
    group by streak_group
  ),
  read_genres as (
    select b.genre
    from public.user_books ub
    join public.books b on b.id = ub.book_id
    where ub.user_id = target_user_id and ub.shelf = 'read'
    union
    select cb.genre
    from public.user_custom_books cb
    where cb.user_id = target_user_id and cb.shelf = 'read'
  )
  select jsonb_build_object(
    'library_books',
      (select count(*) from public.user_books where user_id=target_user_id) +
      (select count(*) from public.user_custom_books where user_id=target_user_id),
    'read_books',
      (select count(*) from public.user_books where user_id=target_user_id and shelf='read') +
      (select count(*) from public.user_custom_books where user_id=target_user_id and shelf='read'),
    'published_comments',
      (select count(*) from public.book_comments where user_id=target_user_id and status='published'),
    'ratings',
      (select count(*) from public.book_ratings where user_id=target_user_id),
    'active_days', (select count(*) from activity_days),
    'longest_streak', coalesce((select max(streak_length) from streaks),0),
    'read_genres', (select count(*) from read_genres where btrim(coalesce(genre,'')) <> ''),
    'completed_goals', (
      select count(*)
      from public.reading_goals g
      where g.user_id=target_user_id
        and g.target_books <= (
          (select count(*) from public.user_books ub
           where ub.user_id=g.user_id and ub.shelf='read'
             and extract(year from ub.finished_at)::integer=g.goal_year)
          +
          (select count(*) from public.user_custom_books cb
           where cb.user_id=g.user_id and cb.shelf='read'
             and extract(year from cb.finished_at)::integer=g.goal_year)
        )
    )
  );
$$;

revoke execute on function public.gamification_stats(uuid) from public, anon, authenticated;
grant execute on function public.gamification_stats(uuid) to service_role;
