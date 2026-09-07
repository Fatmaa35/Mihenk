-- Intelligence, feedback, safe actions and persistent chat upgrade.
-- Existing Supabase projects: run once in SQL Editor.

alter table public.books add column if not exists original_language text;
alter table public.books add column if not exists atmosphere text[] not null default '{}';
alter table public.books add column if not exists narrative_style text[] not null default '{}';
alter table public.books add column if not exists narrative_pace text;
alter table public.editions add column if not exists isbn10 text;
alter table public.editions add column if not exists isbn13 text;
alter table public.editions add column if not exists translator text;
alter table public.editions add column if not exists edition_label text;

alter table public.user_preferences add column if not exists liked_styles text[] not null default '{}';
alter table public.user_preferences add column if not exists disliked_styles text[] not null default '{}';
alter table public.user_preferences add column if not exists pace_preference text;
alter table public.user_preferences add column if not exists focus_preference text;
alter table public.user_preferences add column if not exists tone_preference text;
alter table public.user_preferences add column if not exists violence_sensitivity smallint not null default 0;
alter table public.user_preferences add column if not exists romance_sensitivity smallint not null default 0;
alter table public.user_preferences add column if not exists spoiler_sensitivity smallint not null default 2;
alter table public.user_preferences add column if not exists length_preference text;

alter table public.user_books add column if not exists abandonment_reason text;
alter table public.user_custom_books add column if not exists abandonment_reason text;
alter table public.user_books drop constraint if exists user_books_shelf_check;
alter table public.user_books add constraint user_books_shelf_check check (shelf in ('read','reading','to_read','abandoned'));
alter table public.user_custom_books drop constraint if exists user_custom_books_shelf_check;
alter table public.user_custom_books add constraint user_custom_books_shelf_check check (shelf in ('read','reading','to_read','abandoned'));

create table if not exists public.recommendation_feedback (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null references public.books(id) on delete cascade,
    feedback_type text not null check (feedback_type in ('great_match','not_for_me','already_know','more_like_this')),
    query_text text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    unique (user_id,book_id,feedback_type)
);
create table if not exists public.chat_sessions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Yeni sohbet', summary text not null default '',
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(), session_id uuid not null references public.chat_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('user','assistant')),
    content text not null, books jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.reading_plans (
    user_id uuid not null references auth.users(id) on delete cascade, book_id text not null references public.books(id) on delete cascade,
    target_date date not null, daily_pages integer not null check (daily_pages > 0), reminder_enabled boolean not null default false,
    updated_at timestamptz not null default now(), primary key (user_id,book_id)
);
create table if not exists public.recommendation_events (
    id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null,
    query_text text not null, result_count integer not null default 0, fallback_used boolean not null default false,
    latency_ms integer not null default 0, created_at timestamptz not null default now()
);

create index if not exists recommendation_feedback_user_idx on public.recommendation_feedback(user_id,feedback_type,updated_at desc);
create index if not exists chat_sessions_user_updated_idx on public.chat_sessions(user_id,updated_at desc);
create index if not exists chat_messages_session_created_idx on public.chat_messages(session_id,created_at);
create index if not exists chat_messages_user_idx on public.chat_messages(user_id);
create index if not exists reading_plans_book_idx on public.reading_plans(book_id);
create index if not exists recommendation_events_user_idx on public.recommendation_events(user_id) where user_id is not null;
create index if not exists recommendation_feedback_book_idx on public.recommendation_feedback(book_id);

alter table public.recommendation_feedback enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reading_plans enable row level security;
alter table public.recommendation_events enable row level security;

drop policy if exists feedback_own on public.recommendation_feedback;
create policy feedback_own on public.recommendation_feedback for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists chat_sessions_own on public.chat_sessions;
create policy chat_sessions_own on public.chat_sessions for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists chat_messages_own on public.chat_messages;
create policy chat_messages_own on public.chat_messages for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists reading_plans_own on public.reading_plans;
create policy reading_plans_own on public.reading_plans for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists recommendation_events_backend_only on public.recommendation_events;
create policy recommendation_events_backend_only on public.recommendation_events for all to service_role using (true) with check (true);

revoke all on public.recommendation_feedback,public.chat_sessions,public.chat_messages,public.reading_plans,public.recommendation_events from anon,authenticated;
grant select,insert,update,delete on public.recommendation_feedback,public.chat_sessions,public.reading_plans to authenticated;
grant select,insert,delete on public.chat_messages to authenticated;
grant all privileges on public.recommendation_feedback,public.chat_sessions,public.chat_messages,public.reading_plans,public.recommendation_events to service_role;
grant usage,select on all sequences in schema public to service_role;
