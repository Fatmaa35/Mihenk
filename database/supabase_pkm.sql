-- PKM reading sessions and quotes for existing Supabase installations.
-- Safe to run more than once from the Supabase SQL Editor.

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'user_custom_books_user_id_id_key'
          and conrelid = 'public.user_custom_books'::regclass
    ) then
        alter table public.user_custom_books
        add constraint user_custom_books_user_id_id_key unique (user_id, id);
    end if;
end $$;

create table if not exists public.reading_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text references public.books(id) on delete cascade,
    custom_book_id uuid,
    start_page integer not null check (start_page >= 0),
    end_page integer not null check (end_page >= start_page),
    duration_minutes integer not null check (duration_minutes >= 0),
    session_date date not null default current_date,
    created_at timestamptz not null default now(),
    check ((book_id is not null)::integer + (custom_book_id is not null)::integer = 1),
    foreign key (user_id, custom_book_id)
        references public.user_custom_books(user_id, id) on delete cascade
);

create table if not exists public.book_quotes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text references public.books(id) on delete cascade,
    custom_book_id uuid,
    quote_text text not null check (char_length(btrim(quote_text)) between 1 and 5000),
    page_number integer check (page_number is null or page_number >= 0),
    tags jsonb not null default '[]'::jsonb check (
        jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 10
    ),
    source_type text not null default 'manual' check (
        source_type in ('manual', 'ocr', 'barcode_import')
    ),
    created_at timestamptz not null default now(),
    check ((book_id is not null)::integer + (custom_book_id is not null)::integer = 1),
    foreign key (user_id, custom_book_id)
        references public.user_custom_books(user_id, id) on delete cascade
);

create index if not exists reading_sessions_user_created_idx
on public.reading_sessions (user_id, created_at desc);
create index if not exists reading_sessions_book_idx on public.reading_sessions (book_id)
where book_id is not null;
create index if not exists reading_sessions_custom_book_idx on public.reading_sessions (custom_book_id)
where custom_book_id is not null;
create index if not exists reading_sessions_owner_custom_book_idx
on public.reading_sessions (user_id, custom_book_id);
create index if not exists book_quotes_user_created_idx
on public.book_quotes (user_id, created_at desc);
create index if not exists book_quotes_book_idx on public.book_quotes (book_id)
where book_id is not null;
create index if not exists book_quotes_custom_book_idx on public.book_quotes (custom_book_id)
where custom_book_id is not null;
create index if not exists book_quotes_owner_custom_book_idx
on public.book_quotes (user_id, custom_book_id);

alter table public.reading_sessions enable row level security;
alter table public.book_quotes enable row level security;

drop policy if exists reading_sessions_select_own on public.reading_sessions;
create policy reading_sessions_select_own
on public.reading_sessions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_insert_own on public.reading_sessions;
create policy reading_sessions_insert_own
on public.reading_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_update_own on public.reading_sessions;
create policy reading_sessions_update_own
on public.reading_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_delete_own on public.reading_sessions;
create policy reading_sessions_delete_own
on public.reading_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists book_quotes_select_own on public.book_quotes;
create policy book_quotes_select_own
on public.book_quotes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists book_quotes_insert_own on public.book_quotes;
create policy book_quotes_insert_own
on public.book_quotes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists book_quotes_update_own on public.book_quotes;
create policy book_quotes_update_own
on public.book_quotes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists book_quotes_delete_own on public.book_quotes;
create policy book_quotes_delete_own
on public.book_quotes for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.reading_sessions, public.book_quotes from anon, authenticated;
grant select, insert, update, delete on public.reading_sessions, public.book_quotes to authenticated;
grant all privileges on public.reading_sessions, public.book_quotes to service_role;
