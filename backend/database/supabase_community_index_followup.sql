-- Cover foreign keys reported by the Supabase performance advisor.
create index if not exists comment_reports_moderator_idx
  on public.comment_reports(moderator_id) where moderator_id is not null;
create index if not exists user_badges_badge_code_idx
  on public.user_badges(badge_code);
