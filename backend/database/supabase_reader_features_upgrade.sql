-- Upgrade an existing Supabase project with reader-owned tables and progress fields.
alter table public.user_books add column if not exists current_page integer not null default 0;
alter table public.user_books add column if not exists total_pages integer;
alter table public.user_books add column if not exists started_at timestamptz;
alter table public.user_books add column if not exists finished_at timestamptz;
alter table public.user_books drop constraint if exists user_books_shelf_check;
alter table public.user_books drop constraint if exists user_books_current_page_check;
alter table public.user_books drop constraint if exists user_books_total_pages_check;
alter table public.user_books drop constraint if exists user_books_progress_check;
alter table public.user_books add constraint user_books_shelf_check
check (shelf in ('read', 'reading', 'to_read'));
alter table public.user_books add constraint user_books_current_page_check check (current_page >= 0);
alter table public.user_books add constraint user_books_total_pages_check check (total_pages is null or total_pages > 0);
alter table public.user_books add constraint user_books_progress_check check (total_pages is null or current_page <= total_pages);

create table if not exists public.user_custom_books (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(btrim(title)) between 1 and 255),
    author text not null default 'Bilinmeyen yazar',
    genre text not null default 'Genel',
    cover_url text,
    shelf text not null check (shelf in ('read', 'reading', 'to_read')),
    is_favorite boolean not null default false,
    current_page integer not null default 0 check (current_page >= 0),
    total_pages integer check (total_pages is null or total_pages > 0),
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (total_pages is null or current_page <= total_pages)
);

create table if not exists public.reading_goals (
    user_id uuid not null references auth.users(id) on delete cascade,
    goal_year smallint not null check (goal_year between 2000 and 2200),
    target_books smallint not null check (target_books between 1 and 1000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, goal_year)
);

create table if not exists public.reading_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text references public.books(id) on delete cascade,
    custom_book_id uuid references public.user_custom_books(id) on delete cascade,
    activity_date date not null default current_date,
    pages_read integer not null check (pages_read > 0),
    created_at timestamptz not null default now(),
    check ((book_id is not null)::integer + (custom_book_id is not null)::integer = 1)
);

create table if not exists public.price_alerts (
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null references public.books(id) on delete cascade,
    target_price_minor integer not null check (target_price_minor > 0),
    currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
    is_active boolean not null default true,
    last_notified_price_minor integer check (last_notified_price_minor is null or last_notified_price_minor >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, book_id)
);

create table if not exists public.notifications (
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

create index if not exists user_books_shelf_idx on public.user_books (user_id, shelf);
create index if not exists user_custom_books_user_shelf_idx on public.user_custom_books (user_id, shelf);
create index if not exists reading_activity_user_date_idx on public.reading_activity (user_id, activity_date);
create index if not exists reading_activity_book_id_idx on public.reading_activity (book_id);
create index if not exists reading_activity_custom_book_id_idx on public.reading_activity (custom_book_id);
create index if not exists price_alerts_active_book_idx on public.price_alerts (book_id) where is_active;
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_book_id_idx on public.notifications (book_id);

drop trigger if exists user_books_set_updated_at on public.user_books;
create trigger user_books_set_updated_at before update on public.user_books
for each row execute function private.set_updated_at();
drop trigger if exists user_custom_books_set_updated_at on public.user_custom_books;
create trigger user_custom_books_set_updated_at before update on public.user_custom_books
for each row execute function private.set_updated_at();
drop trigger if exists reading_goals_set_updated_at on public.reading_goals;
create trigger reading_goals_set_updated_at before update on public.reading_goals
for each row execute function private.set_updated_at();
drop trigger if exists price_alerts_set_updated_at on public.price_alerts;
create trigger price_alerts_set_updated_at before update on public.price_alerts
for each row execute function private.set_updated_at();

alter table public.user_custom_books enable row level security;
alter table public.reading_goals enable row level security;
alter table public.reading_activity enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;

drop policy if exists user_custom_books_select_own on public.user_custom_books;
create policy user_custom_books_select_own on public.user_custom_books for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_custom_books_insert_own on public.user_custom_books;
create policy user_custom_books_insert_own on public.user_custom_books for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_custom_books_update_own on public.user_custom_books;
create policy user_custom_books_update_own on public.user_custom_books for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists user_custom_books_delete_own on public.user_custom_books;
create policy user_custom_books_delete_own on public.user_custom_books for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists reading_goals_select_own on public.reading_goals;
create policy reading_goals_select_own on public.reading_goals for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists reading_goals_insert_own on public.reading_goals;
create policy reading_goals_insert_own on public.reading_goals for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists reading_goals_update_own on public.reading_goals;
create policy reading_goals_update_own on public.reading_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists reading_activity_select_own on public.reading_activity;
create policy reading_activity_select_own on public.reading_activity for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists reading_activity_insert_own on public.reading_activity;
create policy reading_activity_insert_own on public.reading_activity for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists price_alerts_select_own on public.price_alerts;
create policy price_alerts_select_own on public.price_alerts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists price_alerts_insert_own on public.price_alerts;
create policy price_alerts_insert_own on public.price_alerts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists price_alerts_update_own on public.price_alerts;
create policy price_alerts_update_own on public.price_alerts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists price_alerts_delete_own on public.price_alerts;
create policy price_alerts_delete_own on public.price_alerts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_custom_books to authenticated;
grant select, insert, update on public.reading_goals to authenticated;
grant select, insert on public.reading_activity to authenticated;
grant select, insert, update, delete on public.price_alerts to authenticated;
grant select, update on public.notifications to authenticated;
grant all privileges on public.user_custom_books, public.reading_goals, public.reading_activity, public.price_alerts, public.notifications to service_role;

create or replace function public.update_reading_progress(
    p_book_id text, p_shelf text, p_is_favorite boolean default false,
    p_current_page integer default 0, p_total_pages integer default null
)
returns setof public.user_books
language plpgsql security invoker set search_path = ''
as $$
declare
    v_user_id uuid := (select auth.uid());
    v_previous_page integer := 0;
    v_pages_read integer := 0;
begin
    if v_user_id is null then raise exception 'Authentication required'; end if;
    if p_shelf not in ('to_read', 'reading', 'read') then raise exception 'Invalid shelf'; end if;
    if p_current_page < 0 or (p_total_pages is not null and p_total_pages <= 0)
       or (p_total_pages is not null and p_current_page > p_total_pages) then
        raise exception 'Invalid page values';
    end if;

    select coalesce(ub.current_page, 0) into v_previous_page
    from public.user_books ub where ub.user_id=v_user_id and ub.book_id=p_book_id;
    v_previous_page := coalesce(v_previous_page, 0);

    insert into public.user_books (
        user_id,book_id,shelf,is_favorite,current_page,total_pages,started_at,finished_at
    ) values (
        v_user_id,p_book_id,p_shelf,p_is_favorite,p_current_page,p_total_pages,
        case when p_shelf in ('reading','read') then now() end,
        case when p_shelf='read' then now() end
    )
    on conflict (user_id,book_id) do update set
        shelf=excluded.shelf,is_favorite=excluded.is_favorite,
        current_page=excluded.current_page,total_pages=excluded.total_pages,
        started_at=coalesce(public.user_books.started_at,
            case when excluded.shelf in ('reading','read') then now() end),
        finished_at=case when excluded.shelf='read'
            then coalesce(public.user_books.finished_at,now()) else null end;

    v_pages_read := greatest(p_current_page-v_previous_page,0);
    if v_pages_read > 0 then
        insert into public.reading_activity(user_id,book_id,pages_read)
        values(v_user_id,p_book_id,v_pages_read);
    end if;
    return query select * from public.user_books ub
        where ub.user_id=v_user_id and ub.book_id=p_book_id;
end;
$$;

create or replace function public.evaluate_price_alerts()
returns integer language plpgsql security invoker set search_path = ''
as $$
declare candidate record; notification_count integer := 0;
begin
    for candidate in
        select a.user_id,a.book_id,a.target_price_minor,a.last_notified_price_minor,
               a.currency,b.title book_title,min(o.price_minor) current_price_minor
        from public.price_alerts a
        join public.books b on b.id=a.book_id
        join public.editions e on e.book_id=a.book_id
        join public.offers o on o.edition_isbn=e.isbn
        where a.is_active and o.stock_status='in_stock' and o.currency=a.currency
        group by a.user_id,a.book_id,a.target_price_minor,a.last_notified_price_minor,a.currency,b.title
        having min(o.price_minor)<=a.target_price_minor
           and (a.last_notified_price_minor is null or min(o.price_minor)<a.last_notified_price_minor)
    loop
        insert into public.notifications(user_id,kind,book_id,title,body,payload)
        values(candidate.user_id,'price_drop',candidate.book_id,'Fiyat hedefinize ulaştı',
            candidate.book_title || ' için yeni bir fiyat bulundu.',
            jsonb_build_object('price_minor',candidate.current_price_minor,
                'target_price_minor',candidate.target_price_minor,'currency',candidate.currency));
        update public.price_alerts set last_notified_price_minor=candidate.current_price_minor
        where user_id=candidate.user_id and book_id=candidate.book_id;
        notification_count := notification_count+1;
    end loop;
    return notification_count;
end;
$$;

revoke execute on function public.update_reading_progress(text,text,boolean,integer,integer) from public,anon;
grant execute on function public.update_reading_progress(text,text,boolean,integer,integer) to authenticated;
revoke execute on function public.evaluate_price_alerts() from public,anon,authenticated;
grant execute on function public.evaluate_price_alerts() to service_role;
