-- Idempotent price collection, pipeline observability and 15-day forecasts.
create table if not exists public.data_pipeline_runs (
    id uuid primary key default gen_random_uuid(),
    idempotency_key text not null unique,
    job_type text not null check (job_type in ('price_refresh','price_forecast')),
    orchestrator text not null default 'manual',
    trigger_kind text not null default 'manual',
    status text not null default 'pending' check (status in ('pending','running','succeeded','partial','failed','skipped')),
    checked_count integer not null default 0 check (checked_count >= 0),
    success_count integer not null default 0 check (success_count >= 0),
    failure_count integer not null default 0 check (failure_count >= 0),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    report jsonb not null default '{}'::jsonb
);

create table if not exists public.data_pipeline_logs (
    id bigint generated always as identity primary key,
    run_id uuid not null references public.data_pipeline_runs(id) on delete cascade,
    level text not null check (level in ('info','warning','error')),
    stage text not null,
    message text not null,
    context jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.price_forecasts (
    id bigint generated always as identity primary key,
    book_id text not null references public.books(id) on delete cascade,
    forecast_date date not null,
    predicted_price_minor integer not null check (predicted_price_minor >= 0),
    lower_price_minor integer not null check (lower_price_minor >= 0),
    upper_price_minor integer not null check (upper_price_minor >= lower_price_minor),
    drop_probability numeric(5,4) not null check (drop_probability between 0 and 1),
    model_name text not null,
    model_version text not null,
    trained_through date not null,
    created_at timestamptz not null default now(),
    unique (book_id, forecast_date, model_version)
);

create index if not exists data_pipeline_runs_started_idx
on public.data_pipeline_runs (started_at desc);
create index if not exists data_pipeline_runs_active_idx
on public.data_pipeline_runs (status, started_at)
where status in ('pending','running');
create index if not exists data_pipeline_logs_run_created_idx
on public.data_pipeline_logs (run_id, created_at desc);
create index if not exists price_forecasts_book_date_idx
on public.price_forecasts (book_id, forecast_date);

alter table public.data_pipeline_runs enable row level security;
alter table public.data_pipeline_logs enable row level security;
alter table public.price_forecasts enable row level security;

drop policy if exists data_pipeline_runs_backend_only on public.data_pipeline_runs;
create policy data_pipeline_runs_backend_only on public.data_pipeline_runs
for all to service_role using (true) with check (true);
drop policy if exists data_pipeline_logs_backend_only on public.data_pipeline_logs;
create policy data_pipeline_logs_backend_only on public.data_pipeline_logs
for all to service_role using (true) with check (true);
drop policy if exists price_forecasts_public_read on public.price_forecasts;
create policy price_forecasts_public_read on public.price_forecasts
for select to anon, authenticated using (true);
drop policy if exists price_forecasts_backend_write on public.price_forecasts;
create policy price_forecasts_backend_write on public.price_forecasts
for all to service_role using (true) with check (true);

revoke all on public.data_pipeline_runs, public.data_pipeline_logs, public.price_forecasts from anon, authenticated;
grant select, insert, update, delete on public.data_pipeline_runs, public.data_pipeline_logs, public.price_forecasts to service_role;
grant usage, select on sequence public.data_pipeline_logs_id_seq, public.price_forecasts_id_seq to service_role;
grant select on public.price_forecasts to anon, authenticated;

