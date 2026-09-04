begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_books'::regclass),
  'user_books has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.reading_sessions'::regclass),
  'reading_sessions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.book_quotes'::regclass),
  'book_quotes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.notification_preferences'::regclass),
  'notification_preferences has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.beta_feedback'::regclass),
  'beta_feedback has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.product_events'::regclass),
  'product_events has RLS enabled'
);

select has_policy('public', 'user_books', 'user_books_select_own', 'user_books ownership policy exists');
select has_policy('public', 'reading_sessions', 'reading_sessions_select_own', 'reading session ownership policy exists');
select has_policy('public', 'notification_preferences', 'notification_preferences_own', 'notification ownership policy exists');
select has_policy('public', 'beta_feedback', 'beta_feedback_own_select', 'beta feedback read policy exists');
select has_policy('public', 'beta_feedback', 'beta_feedback_own_insert', 'beta feedback insert policy exists');

select * from finish();
rollback;
