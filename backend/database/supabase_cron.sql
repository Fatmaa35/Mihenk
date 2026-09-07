-- Optional production scheduling. Run after database/supabase_schema.sql.
-- Supabase extension versions are intentionally not pinned; the platform installs
-- the current secure default version.
create extension if not exists pg_cron;

select cron.schedule(
    'evaluate-book-price-alerts',
    '17 */6 * * *',
    $$ select public.evaluate_price_alerts(); $$
);
