-- Existing Supabase projects: run once in the SQL editor before deploying this build.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

alter table public.books add column if not exists canonical_work_key text;
alter table public.books add column if not exists publication_type text not null default 'unknown';
alter table public.books add column if not exists language text not null default 'tr';
alter table public.books add column if not exists page_count integer;
alter table public.books add column if not exists quality_score numeric(4,3) not null default 0;
alter table public.books add column if not exists quality_flags text[] not null default '{}';
alter table public.books add column if not exists is_recommendable boolean not null default false;
alter table public.books add column if not exists series_name text;
alter table public.books add column if not exists series_index numeric(8,2);
alter table public.books add column if not exists embedding extensions.vector(768);
alter table public.books add column if not exists embedding_model text;
alter table public.books add column if not exists embedding_updated_at timestamptz;
alter table public.editions add column if not exists page_count integer;

update public.books
set canonical_work_key = 'work-' || substring(
    encode(extensions.digest(
        lower(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g')) || '|' ||
        lower(regexp_replace(author, '[^[:alnum:]]+', ' ', 'g')),
        'sha256'
    ), 'hex'), 1, 24
)
where canonical_work_key is null;

update public.books b
set page_count = coalesce(
        b.page_count,
        (select max(e.page_count) from public.editions e where e.book_id=b.id)
    ),
    publication_type = case
        when lower(b.title || ' ' || b.genre || ' ' || array_to_string(b.themes, ' '))
             ~ '(ders kitab|öğrenciler için|öğrencilere|seçme örnekler|sempozyum|bildiriler|tezler|sosyolojiye giriş)'
            then 'academic'
        when lower(b.title || ' ' || b.genre) ~ '(ansiklopedi|encyclopedia|sözlük|dictionary|bibliyograf|kaynakça|handbook|catalogue)'
            then 'reference'
        when lower(b.genre) ~ '(roman|öykü|hikâye|hikaye|polisiye|bilim kurgu|fantastik|gerilim|korku|macera|romantik|grafik roman|klasik|mizah)'
            then 'fiction'
        when lower(b.genre) like '%deneme%' then 'essay'
        when lower(b.genre) like '%şiir%' then 'poetry'
        when lower(b.genre) like '%çocuk ve gençlik%' then 'children'
        when lower(b.genre) in ('', 'genel') then 'unknown'
        else 'nonfiction'
    end,
    quality_score = case
        when b.source_name='local_curated' then 0.98
        else least(1.0,
            0.20
            + case when exists(select 1 from public.editions e where e.book_id=b.id) then 0.14 else 0 end
            + case when b.cover_url is not null then 0.10 else 0 end
            + case when b.genre <> 'Genel' then 0.10 else 0 end
            + case when cardinality(b.themes) >= 2 then 0.08 else 0 end
            + case when length(b.description) >= 120 and lower(b.description) not like '%open library kataloğunda%' then 0.14 else 0 end
            + case when b.source_url is not null then 0.08 else 0 end
            + case when exists(select 1 from public.editions e where e.book_id=b.id and e.publisher is not null) then 0.06 else 0 end
            + case when b.page_count is not null or exists(select 1 from public.editions e where e.book_id=b.id and e.page_count is not null) then 0.05 else 0 end
        )
    end;

update public.books
set quality_flags = array_remove(array[
        case when cover_url is null then 'missing_cover' end,
        case when genre='Genel' then 'generic_genre' end,
        case when page_count is null then 'missing_page_count' end,
        case when publication_type in ('academic','reference','unknown') then 'publication_type:' || publication_type end
    ], null),
    is_recommendable = publication_type not in ('academic','reference','unknown')
        and quality_score >= 0.48;

create index if not exists books_canonical_work_idx on public.books (canonical_work_key);
create index if not exists books_recommendation_pool_idx
on public.books (publication_type, quality_score desc)
where is_recommendable;

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
    select b.id, (1 - (b.embedding OPERATOR(extensions.<=>) query_embedding))::real
    from public.books b
    where b.embedding is not null and b.is_recommendable
    order by b.embedding OPERATOR(extensions.<=>) query_embedding
    limit least(greatest(match_count, 1), 100);
$$;
