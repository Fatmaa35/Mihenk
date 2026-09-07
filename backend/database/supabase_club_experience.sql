-- Book club journey: progress, roadmap, spoiler-safe discussions, reactions, events and voting.
alter table if exists public.book_clubs add column if not exists rules text not null default '';

create table if not exists public.book_club_progress (
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  current_page integer not null default 0 check(current_page >= 0),
  total_pages integer check(total_pages is null or total_pages > 0),
  daily_target_pages integer not null default 10 check(daily_target_pages > 0),
  updated_at timestamptz not null default now(),
  primary key(club_id,user_id,book_id)
);
create index if not exists book_club_progress_book_idx on public.book_club_progress(book_id);

create table if not exists public.book_club_discussions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  content text not null check(char_length(btrim(content)) between 2 and 2000),
  page_number integer check(page_number is null or page_number > 0),
  chapter_title text,
  discussion_type text not null default 'discussion' check(discussion_type in ('discussion','quote','question','analysis')),
  parent_id uuid references public.book_club_discussions(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists book_club_discussions_feed_idx on public.book_club_discussions(club_id,book_id,page_number,created_at desc);
create index if not exists book_club_discussions_user_idx on public.book_club_discussions(user_id);
create index if not exists book_club_discussions_parent_idx on public.book_club_discussions(parent_id);

create table if not exists public.book_club_reactions (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.book_club_discussions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check(reaction_type in ('thoughtful','agree','heart','bookmark')),
  created_at timestamptz not null default now(),
  unique(discussion_id,user_id,reaction_type)
);
create index if not exists book_club_reactions_disc_idx on public.book_club_reactions(discussion_id);
create index if not exists book_club_reactions_user_idx on public.book_club_reactions(user_id);

create table if not exists public.book_club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 2 and 160),
  description text not null default '',
  event_type text not null default 'general' check(event_type in ('kickoff','midpoint','final','general')),
  event_date timestamptz not null,
  location text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists book_club_events_club_idx on public.book_club_events(club_id,event_date asc);

create table if not exists public.book_club_event_rsvps (
  event_id uuid not null references public.book_club_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'attending' check(status in ('attending','maybe','declined')),
  created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
create index if not exists book_club_event_rsvps_user_idx on public.book_club_event_rsvps(user_id);

create table if not exists public.book_club_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 2 and 160),
  status text not null default 'open' check(status in ('open','closed')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists book_club_polls_club_idx on public.book_club_polls(club_id,status,created_at desc);
create index if not exists book_club_polls_creator_idx on public.book_club_polls(created_by);

create table if not exists public.book_club_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.book_club_polls(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  unique(poll_id,book_id)
);
create index if not exists book_club_poll_options_book_idx on public.book_club_poll_options(book_id);

create table if not exists public.book_club_votes (
  poll_id uuid not null references public.book_club_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_id uuid not null references public.book_club_poll_options(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key(poll_id,user_id)
);
create index if not exists book_club_votes_user_idx on public.book_club_votes(user_id);
create index if not exists book_club_votes_option_idx on public.book_club_votes(option_id);

alter table public.book_club_progress enable row level security;
alter table public.book_club_discussions enable row level security;
alter table public.book_club_reactions enable row level security;
alter table public.book_club_events enable row level security;
alter table public.book_club_event_rsvps enable row level security;
alter table public.book_club_polls enable row level security;
alter table public.book_club_poll_options enable row level security;
alter table public.book_club_votes enable row level security;

create table if not exists public.book_club_rooms (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.book_clubs(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 2 and 160),
  book_id text references public.books(id) on delete set null,
  phase text not null default 'reading' check(phase in ('reading','break','discussion')),
  duration_minutes integer not null default 25 check(duration_minutes > 0),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists book_club_rooms_club_idx on public.book_club_rooms(club_id);

create table if not exists public.book_club_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.book_club_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check(char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists book_club_room_messages_room_idx on public.book_club_room_messages(room_id, created_at asc);

alter table public.book_club_rooms enable row level security;
alter table public.book_club_room_messages enable row level security;

grant select,insert,update,delete on public.book_club_rooms,public.book_club_room_messages to authenticated,service_role;


