-- Canlı odalar: arkadaşlarla birlikte okuma ya da ders çalışma. Kamera/mikrofon yok; katılımcı listesi ve sohbet.
-- Üyelik ve yetki kontrolleri API'de yapılır; tablolar yalnızca servis rolüyle yazılır.

create table if not exists public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 2 and 80),
  purpose text not null default 'reading' check(purpose in ('reading','study','other')),
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists live_rooms_owner_idx on public.live_rooms(owner_id);

create table if not exists public.live_room_members (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','member')),
  status_text text check(status_text is null or char_length(status_text) <= 80),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  removed_at timestamptz,
  primary key(room_id,user_id)
);
create index if not exists live_room_members_user_idx on public.live_room_members(user_id);

create table if not exists public.live_room_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null default 'text' check(kind in ('text','joined','left','removed')),
  content text not null check(char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists live_room_messages_room_idx on public.live_room_messages(room_id,id);

alter table public.live_rooms enable row level security;
alter table public.live_room_members enable row level security;
alter table public.live_room_messages enable row level security;
-- İstemciye doğrudan erişim verilmez (politika yok); okuma ve yazma API üzerinden servis rolüyle yapılır.
revoke all on public.live_rooms,public.live_room_members,public.live_room_messages from anon,authenticated;
grant all on public.live_rooms,public.live_room_members,public.live_room_messages to service_role;
grant usage,select on sequence public.live_room_messages_id_seq to service_role;
