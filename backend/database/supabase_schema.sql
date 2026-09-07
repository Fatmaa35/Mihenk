-- Akilli Kitap Danismani - Supabase/PostgreSQL schema
-- Public catalog data is readable by everyone. User-owned data is protected by RLS.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create extension if not exists vector with schema extensions;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default 'Okur' check (char_length(display_name) between 1 and 80),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.books (
    id text primary key,
    title text not null,
    author text not null,
    canonical_work_key text,
    genre text not null,
    publication_type text not null default 'unknown' check (
        publication_type in ('fiction', 'nonfiction', 'poetry', 'essay', 'children', 'academic', 'reference', 'unknown')
    ),
    language text not null default 'tr',
    original_language text,
    page_count integer check (page_count is null or page_count > 0),
    themes text[] not null default '{}',
    character_traits text[] not null default '{}',
    atmosphere text[] not null default '{}',
    narrative_style text[] not null default '{}',
    narrative_pace text check (narrative_pace is null or narrative_pace in ('slow','medium','fast')),
    description text not null default '',
    quality_score numeric(4,3) not null default 0 check (quality_score between 0 and 1),
    quality_flags text[] not null default '{}',
    is_recommendable boolean not null default false,
    source_name text,
    source_url text,
    cover_url text,
    series_name text,
    series_index numeric(8,2) check (series_index is null or series_index > 0),
    embedding extensions.vector(768),
    embedding_model text,
    embedding_updated_at timestamptz,
    metadata_updated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    search_document tsvector generated always as (
        setweight(to_tsvector('turkish', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('turkish', coalesce(author, '')), 'A') ||
        setweight(to_tsvector('turkish', coalesce(genre, '')), 'B') ||
        setweight(to_tsvector('turkish', coalesce(publication_type, '')), 'B') ||
        setweight(to_tsvector('turkish', coalesce(description, '')), 'C')
    ) stored
);

create table public.book_sources (
    id bigint generated always as identity primary key,
    book_id text not null references public.books(id) on delete cascade,
    source_name text not null,
    source_url text not null,
    source_type text not null check (
        source_type in ('public_domain', 'open_library', 'publisher', 'retailer', 'manual')
    ),
    rights_status text not null default 'metadata_only' check (
        rights_status in ('public_domain', 'open_license', 'metadata_only', 'unknown')
    ),
    license_name text,
    license_url text,
    fetched_at timestamptz not null default now(),
    content_hash text,
    unique (book_id, source_url)
);

create table public.user_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    personality_text text not null default '',
    selected_traits text[] not null default '{}',
    preferred_genres text[] not null default '{}',
    disliked_genres text[] not null default '{}',
    liked_styles text[] not null default '{}',
    disliked_styles text[] not null default '{}',
    pace_preference text check (pace_preference is null or pace_preference in ('slow','medium','fast','mixed')),
    focus_preference text check (focus_preference is null or focus_preference in ('character','plot','balanced')),
    tone_preference text check (tone_preference is null or tone_preference in ('dark','hopeful','balanced')),
    violence_sensitivity smallint not null default 0 check (violence_sensitivity between 0 and 3),
    romance_sensitivity smallint not null default 0 check (romance_sensitivity between 0 and 3),
    spoiler_sensitivity smallint not null default 2 check (spoiler_sensitivity between 0 and 3),
    length_preference text check (length_preference is null or length_preference in ('short','medium','long','any')),
    updated_at timestamptz not null default now()
);

create table public.user_books (
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null references public.books(id) on delete cascade,
    shelf text not null check (shelf in ('read', 'reading', 'to_read', 'abandoned')),
    is_favorite boolean not null default false,
    current_page integer not null default 0 check (current_page >= 0),
    total_pages integer check (total_pages is null or total_pages > 0),
    started_at timestamptz,
    finished_at timestamptz,
    abandonment_reason text,
    updated_at timestamptz not null default now(),
    primary key (user_id, book_id),
    check (total_pages is null or current_page <= total_pages)
);

create table public.user_custom_books (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(btrim(title)) between 1 and 255),
    author text not null default 'Bilinmeyen yazar',
    genre text not null default 'Genel',
    cover_url text,
    shelf text not null check (shelf in ('read', 'reading', 'to_read', 'abandoned')),
    is_favorite boolean not null default false,
    current_page integer not null default 0 check (current_page >= 0),
    total_pages integer check (total_pages is null or total_pages > 0),
    started_at timestamptz,
    finished_at timestamptz,
    abandonment_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (total_pages is null or current_page <= total_pages),
    unique (user_id, id)
);

create table public.reading_goals (
    user_id uuid not null references auth.users(id) on delete cascade,
    goal_year smallint not null check (goal_year between 2000 and 2200),
    target_books smallint not null check (target_books between 1 and 1000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, goal_year)
);

create table public.reading_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text references public.books(id) on delete cascade,
    custom_book_id uuid references public.user_custom_books(id) on delete cascade,
    activity_date date not null default current_date,
    pages_read integer not null check (pages_read > 0),
    created_at timestamptz not null default now(),
    check ((book_id is not null)::integer + (custom_book_id is not null)::integer = 1)
);

create table public.reading_sessions (
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

create table public.book_quotes (
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

create index reading_sessions_user_created_idx
on public.reading_sessions (user_id, created_at desc);
create index reading_sessions_book_idx on public.reading_sessions (book_id)
where book_id is not null;
create index reading_sessions_custom_book_idx on public.reading_sessions (custom_book_id)
where custom_book_id is not null;
create index reading_sessions_owner_custom_book_idx
on public.reading_sessions (user_id, custom_book_id);
create index book_quotes_user_created_idx
on public.book_quotes (user_id, created_at desc);
create index book_quotes_book_idx on public.book_quotes (book_id)
where book_id is not null;
create index book_quotes_custom_book_idx on public.book_quotes (custom_book_id)
where custom_book_id is not null;
create index book_quotes_owner_custom_book_idx
on public.book_quotes (user_id, custom_book_id);

create table public.price_alerts (
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null references public.books(id) on delete cascade,
    target_price_minor integer not null check (target_price_minor > 0),
    currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
    is_active boolean not null default true,
    last_notified_price_minor integer check (
        last_notified_price_minor is null or last_notified_price_minor >= 0
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, book_id)
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('price_drop')),
    book_id text references public.books(id) on delete cascade,
    title text not null,
    body text not null,
    payload jsonb not null default '{}'::jsonb,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.recommendation_feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null references public.books(id) on delete cascade,
    feedback_type text not null check (feedback_type in ('great_match','not_for_me','already_know','more_like_this')),
    query_text text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id,book_id,feedback_type)
);

create table public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Yeni sohbet',
    summary text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.chat_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('user','assistant')),
    content text not null,
    books jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create table public.reading_plans (
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null references public.books(id) on delete cascade,
    target_date date not null,
    daily_pages integer not null check (daily_pages > 0),
    reminder_enabled boolean not null default false,
    updated_at timestamptz not null default now(),
    primary key (user_id,book_id)
);

create table public.recommendation_events (
    id bigint generated always as identity primary key,
    user_id uuid references auth.users(id) on delete set null,
    query_text text not null,
    result_count integer not null default 0,
    fallback_used boolean not null default false,
    latency_ms integer not null default 0,
    created_at timestamptz not null default now()
);

create index recommendation_feedback_user_idx on public.recommendation_feedback (user_id,feedback_type,updated_at desc);
create index chat_sessions_user_updated_idx on public.chat_sessions (user_id,updated_at desc);
create index chat_messages_session_created_idx on public.chat_messages (session_id,created_at);
create index chat_messages_user_idx on public.chat_messages (user_id);
create index reading_plans_book_idx on public.reading_plans (book_id);
create index recommendation_events_user_idx on public.recommendation_events (user_id) where user_id is not null;
create index recommendation_feedback_book_idx on public.recommendation_feedback (book_id);
create index recommendation_events_created_idx on public.recommendation_events (created_at desc);

create table public.retailers (
    id text primary key,
    name text not null,
    base_url text not null,
    robots_url text not null,
    content_policy text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.editions (
    isbn text primary key check (isbn ~ '^97[89][0-9]{10}$'),
    isbn10 text unique check (isbn10 is null or isbn10 ~ '^[0-9]{9}[0-9X]$'),
    isbn13 text unique check (isbn13 is null or isbn13 ~ '^97[89][0-9]{10}$'),
    book_id text references public.books(id) on delete set null,
    title text not null,
    author text,
    publisher text,
    translator text,
    edition_label text,
    language text,
    page_count integer check (page_count is null or page_count > 0),
    published_date text,
    source_name text,
    source_url text,
    verification_status text not null default 'unverified' check (
        verification_status in ('unverified', 'verified', 'retailer_verified')
    ),
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.offers (
    id bigint generated always as identity primary key,
    edition_isbn text not null references public.editions(isbn) on delete cascade,
    retailer_id text not null references public.retailers(id) on delete cascade,
    product_url text not null,
    price_minor integer not null check (price_minor >= 0),
    list_price_minor integer check (list_price_minor is null or list_price_minor >= 0),
    currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
    stock_status text not null default 'unknown' check (
        stock_status in ('in_stock', 'out_of_stock', 'unknown')
    ),
    checked_at timestamptz not null,
    content_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (edition_isbn, retailer_id)
);

create table public.price_history (
    id bigint generated always as identity primary key,
    offer_id bigint not null references public.offers(id) on delete cascade,
    price_minor integer not null check (price_minor >= 0),
    stock_status text not null check (
        stock_status in ('in_stock', 'out_of_stock', 'unknown')
    ),
    observed_at timestamptz not null default now()
);

create table public.edition_verification_attempts (
    book_id text primary key references public.books(id) on delete cascade,
    status text not null check (status in ('verified', 'missing', 'error')),
    attempted_at timestamptz not null default now(),
    error text
);

create table public.collector_runs (
    id uuid primary key default gen_random_uuid(),
    job_type text not null check (
        job_type in ('catalog_import', 'edition_verification', 'price_refresh')
    ),
    status text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    checked_count integer not null default 0 check (checked_count >= 0),
    success_count integer not null default 0 check (success_count >= 0),
    failure_count integer not null default 0 check (failure_count >= 0),
    report jsonb not null default '{}'::jsonb
);

create index books_genre_idx on public.books (genre);
create index books_search_document_idx on public.books using gin (search_document);
create index books_canonical_work_idx on public.books (canonical_work_key);
create index books_recommendation_pool_idx
on public.books (publication_type, quality_score desc)
where is_recommendable;
create index books_embedding_hnsw_idx on public.books
using hnsw (embedding extensions.vector_cosine_ops)
where embedding is not null;
create index book_sources_book_id_idx on public.book_sources (book_id);
create index user_books_shelf_idx on public.user_books (user_id, shelf);
create index user_books_book_id_idx on public.user_books (book_id);
create index user_custom_books_user_shelf_idx on public.user_custom_books (user_id, shelf);
create index reading_activity_user_date_idx on public.reading_activity (user_id, activity_date);
create index reading_activity_book_id_idx on public.reading_activity (book_id);
create index reading_activity_custom_book_id_idx on public.reading_activity (custom_book_id);
create index price_alerts_active_book_idx on public.price_alerts (book_id)
where is_active = true;
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index editions_book_id_idx on public.editions (book_id);
create index editions_verification_idx on public.editions (verification_status, language);
create index offers_edition_isbn_idx on public.offers (edition_isbn);
create index offers_retailer_id_idx on public.offers (retailer_id);
create index offers_checked_at_idx on public.offers (checked_at desc);
create index price_history_offer_time_idx on public.price_history (offer_id, observed_at desc);
create index collector_runs_started_at_idx on public.collector_runs (started_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger books_set_updated_at
before update on public.books
for each row execute function private.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function private.set_updated_at();

create trigger user_books_set_updated_at
before update on public.user_books
for each row execute function private.set_updated_at();

create trigger user_custom_books_set_updated_at
before update on public.user_custom_books
for each row execute function private.set_updated_at();

create trigger reading_goals_set_updated_at
before update on public.reading_goals
for each row execute function private.set_updated_at();

create trigger price_alerts_set_updated_at
before update on public.price_alerts
for each row execute function private.set_updated_at();

create trigger retailers_set_updated_at
before update on public.retailers
for each row execute function private.set_updated_at();

create trigger editions_set_updated_at
before update on public.editions
for each row execute function private.set_updated_at();

create trigger offers_set_updated_at
before update on public.offers
for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Okur')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select
    id,
    coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), 'Okur')
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_sources enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_books enable row level security;
alter table public.user_custom_books enable row level security;
alter table public.reading_goals enable row level security;
alter table public.reading_activity enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.book_quotes enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reading_plans enable row level security;
alter table public.recommendation_events enable row level security;
alter table public.retailers enable row level security;
alter table public.editions enable row level security;
alter table public.offers enable row level security;
alter table public.price_history enable row level security;
alter table public.edition_verification_attempts enable row level security;
alter table public.collector_runs enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy preferences_select_own
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy preferences_insert_own
on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy preferences_update_own
on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy preferences_delete_own
on public.user_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

create policy user_books_select_own
on public.user_books for select to authenticated
using ((select auth.uid()) = user_id);

create policy user_books_insert_own
on public.user_books for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy user_books_update_own
on public.user_books for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_books_delete_own
on public.user_books for delete to authenticated
using ((select auth.uid()) = user_id);

create policy user_custom_books_select_own
on public.user_custom_books for select to authenticated
using ((select auth.uid()) = user_id);

create policy user_custom_books_insert_own
on public.user_custom_books for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy user_custom_books_update_own
on public.user_custom_books for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_custom_books_delete_own
on public.user_custom_books for delete to authenticated
using ((select auth.uid()) = user_id);

create policy reading_goals_select_own
on public.reading_goals for select to authenticated
using ((select auth.uid()) = user_id);

create policy reading_goals_insert_own
on public.reading_goals for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy reading_goals_update_own
on public.reading_goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy reading_activity_select_own
on public.reading_activity for select to authenticated
using ((select auth.uid()) = user_id);

create policy reading_activity_insert_own
on public.reading_activity for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy reading_sessions_select_own
on public.reading_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy reading_sessions_insert_own
on public.reading_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy reading_sessions_update_own
on public.reading_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy reading_sessions_delete_own
on public.reading_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

create policy book_quotes_select_own
on public.book_quotes for select to authenticated
using ((select auth.uid()) = user_id);

create policy book_quotes_insert_own
on public.book_quotes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy book_quotes_update_own
on public.book_quotes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy book_quotes_delete_own
on public.book_quotes for delete to authenticated
using ((select auth.uid()) = user_id);

create policy price_alerts_select_own
on public.price_alerts for select to authenticated
using ((select auth.uid()) = user_id);

create policy price_alerts_insert_own
on public.price_alerts for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy price_alerts_update_own
on public.price_alerts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy price_alerts_delete_own
on public.price_alerts for delete to authenticated
using ((select auth.uid()) = user_id);

create policy notifications_select_own
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy notifications_update_own
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy feedback_own on public.recommendation_feedback for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy chat_sessions_own on public.chat_sessions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy chat_messages_own on public.chat_messages for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reading_plans_own on public.reading_plans for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recommendation_events_backend_only on public.recommendation_events for all to service_role
using (true) with check (true);

create policy books_public_read
on public.books for select to anon, authenticated
using (true);

create policy book_sources_public_read
on public.book_sources for select to anon, authenticated
using (true);

create policy retailers_public_read
on public.retailers for select to anon, authenticated
using (true);

create policy editions_public_read
on public.editions for select to anon, authenticated
using (true);

create policy offers_public_read
on public.offers for select to anon, authenticated
using (true);

create policy price_history_public_read
on public.price_history for select to anon, authenticated
using (true);

create policy verification_attempts_backend_only
on public.edition_verification_attempts for all to service_role
using (true)
with check (true);

create policy collector_runs_backend_only
on public.collector_runs for all to service_role
using (true)
with check (true);

create or replace function public.match_books(
    query_embedding extensions.vector(768),
    match_count integer default 20
)
returns table (book_id text, semantic_score real)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        b.id,
        (1 - (b.embedding OPERATOR(extensions.<=>) query_embedding))::real
    from public.books b
    where b.embedding is not null
      and b.is_recommendable
    order by b.embedding OPERATOR(extensions.<=>) query_embedding
    limit least(greatest(match_count, 1), 100);
$$;

create or replace function public.update_reading_progress(
    p_book_id text,
    p_shelf text,
    p_is_favorite boolean default false,
    p_current_page integer default 0,
    p_total_pages integer default null
)
returns setof public.user_books
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_previous_page integer := 0;
    v_pages_read integer := 0;
begin
    v_user_id := (select auth.uid());
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;
    if p_shelf not in ('to_read', 'reading', 'read') then
        raise exception 'Invalid shelf';
    end if;
    if p_current_page < 0 or p_total_pages is not null and p_total_pages <= 0 then
        raise exception 'Invalid page values';
    end if;
    if p_total_pages is not null and p_current_page > p_total_pages then
        raise exception 'Current page cannot exceed total pages';
    end if;

    select ub.current_page into v_previous_page
    from public.user_books ub
    where ub.user_id = v_user_id and ub.book_id = p_book_id;
    v_previous_page := coalesce(v_previous_page, 0);

    insert into public.user_books (
        user_id, book_id, shelf, is_favorite, current_page, total_pages,
        started_at, finished_at
    ) values (
        v_user_id, p_book_id, p_shelf, p_is_favorite, p_current_page, p_total_pages,
        case when p_shelf in ('reading', 'read') then now() else null end,
        case when p_shelf = 'read' then now() else null end
    )
    on conflict (user_id, book_id) do update set
        shelf = excluded.shelf,
        is_favorite = excluded.is_favorite,
        current_page = excluded.current_page,
        total_pages = excluded.total_pages,
        started_at = coalesce(
            public.user_books.started_at,
            case when excluded.shelf in ('reading', 'read') then now() else null end
        ),
        finished_at = case
            when excluded.shelf = 'read' then coalesce(public.user_books.finished_at, now())
            else null
        end;

    v_pages_read := greatest(p_current_page - v_previous_page, 0);
    if v_pages_read > 0 then
        insert into public.reading_activity (user_id, book_id, pages_read)
        values (v_user_id, p_book_id, v_pages_read);
    end if;

    return query
    select * from public.user_books ub
    where ub.user_id = v_user_id and ub.book_id = p_book_id;
end;
$$;

create or replace function public.evaluate_price_alerts()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
    candidate record;
    notification_count integer := 0;
begin
    for candidate in
        select
            a.user_id,
            a.book_id,
            a.target_price_minor,
            a.last_notified_price_minor,
            b.title as book_title,
            min(o.price_minor) as current_price_minor
        from public.price_alerts a
        join public.books b on b.id = a.book_id
        join public.editions e on e.book_id = a.book_id
        join public.offers o on o.edition_isbn = e.isbn
        where a.is_active = true
          and o.stock_status = 'in_stock'
          and o.currency = a.currency
        group by a.user_id, a.book_id, a.target_price_minor,
                 a.last_notified_price_minor, b.title
        having min(o.price_minor) <= a.target_price_minor
           and (
               a.last_notified_price_minor is null
               or min(o.price_minor) < a.last_notified_price_minor
           )
    loop
        insert into public.notifications (
            user_id, kind, book_id, title, body, payload
        ) values (
            candidate.user_id,
            'price_drop',
            candidate.book_id,
            'Fiyat hedefinize ulasti',
            candidate.book_title || ' icin yeni bir fiyat bulundu.',
            jsonb_build_object(
                'price_minor', candidate.current_price_minor,
                'target_price_minor', candidate.target_price_minor,
                'currency', 'TRY'
            )
        );
        update public.price_alerts
        set last_notified_price_minor = candidate.current_price_minor
        where user_id = candidate.user_id and book_id = candidate.book_id;
        notification_count := notification_count + 1;
    end loop;
    return notification_count;
end;
$$;

revoke execute on function public.match_books(extensions.vector, integer)
from public;
revoke execute on function public.update_reading_progress(text, text, boolean, integer, integer)
from public;
revoke execute on function public.evaluate_price_alerts()
from public, anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

grant select on public.books to anon, authenticated;
grant select on public.book_sources to anon, authenticated;
grant select on public.retailers to anon, authenticated;
grant select on public.editions to anon, authenticated;
grant select on public.offers to anon, authenticated;
grant select on public.price_history to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.user_books to authenticated;
grant select, insert, update, delete on public.user_custom_books to authenticated;
grant select, insert, update on public.reading_goals to authenticated;
grant select, insert on public.reading_activity to authenticated;
grant select, insert, update, delete on public.reading_sessions to authenticated;
grant select, insert, update, delete on public.book_quotes to authenticated;
grant select, insert, update, delete on public.price_alerts to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.recommendation_feedback to authenticated;
grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.reading_plans to authenticated;

grant execute on function public.match_books(extensions.vector, integer) to authenticated;
grant execute on function public.update_reading_progress(text, text, boolean, integer, integer)
to authenticated;
grant execute on function public.evaluate_price_alerts() to service_role;

grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

do $$
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
    end if;
end;
$$;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
