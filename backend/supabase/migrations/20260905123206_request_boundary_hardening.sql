begin;

-- RLS limits rows, not columns. Authenticated clients must not be able to
-- supply admin-owned fields when creating their own profile.
revoke insert on public.profiles from public, anon, authenticated;
grant insert (id, display_name) on public.profiles to authenticated;

-- Keep moderation and book/owner assignment outside user-controlled updates.
revoke update on public.book_comments from public, anon, authenticated;
grant update (content, contains_spoiler, updated_at) on public.book_comments to authenticated;

notify pgrst, 'reload schema';
commit;
