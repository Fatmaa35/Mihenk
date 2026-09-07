-- One round-trip dashboard aggregate. The Data API function is intentionally
-- executable only by the service role used by the trusted backend.
create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'verified_users', (select count(*) from public.profiles where is_verified),
    'banned_users', (
      select count(*)
      from public.profiles
      where banned_at is not null
        and (banned_until is null or banned_until > now())
    ),
    'comments', (select count(*) from public.book_comments where status = 'published'),
    'ratings', (select count(*) from public.book_ratings),
    'books', (select count(*) from public.books),
    'offers', (select count(*) from public.offers),
    'top_books', coalesce(
      (
        select jsonb_agg(to_jsonb(ranked_book) order by ranked_book.popularity_score desc, ranked_book.rating_count desc)
        from (
          select id, title, author, rating_average, rating_count, popularity_score
          from public.books
          order by popularity_score desc, rating_count desc
          limit 8
        ) as ranked_book
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.admin_dashboard_stats() from public, anon, authenticated;
grant execute on function public.admin_dashboard_stats() to service_role;
