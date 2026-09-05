begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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

select ok(not has_column_privilege('authenticated','public.profiles','app_role','INSERT'),
          'users cannot insert their own admin role');
select ok(not has_column_privilege('authenticated','public.profiles','is_verified','INSERT'),
          'users cannot insert their own verification');
select ok(has_column_privilege('authenticated','public.profiles','display_name','INSERT'),
          'users can still create a display name');
select ok(not has_column_privilege('authenticated','public.book_comments','status','UPDATE'),
          'users cannot undo comment moderation');
select ok(has_column_privilege('authenticated','public.book_comments','content','UPDATE'),
          'users can still edit comment text');

select * from finish();
rollback;
