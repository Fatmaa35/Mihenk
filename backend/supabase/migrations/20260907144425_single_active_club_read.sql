-- Keep history and progress; only the most recently added active read stays active.
with ranked as (
  select club_id, book_id,
         row_number() over (partition by club_id order by created_at desc, book_id desc) as position
  from public.book_club_reads where status = 'reading'
)
update public.book_club_reads r set status = 'planned'
from ranked x
where r.club_id = x.club_id and r.book_id = x.book_id and x.position > 1;

create or replace function public.enforce_single_active_club_read()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'reading' then
    -- Serialize selections for this club before changing the previous active read.
    perform 1 from public.book_clubs where id = new.club_id for update;
    update public.book_club_reads
       set status = 'planned'
     where club_id = new.club_id and book_id <> new.book_id and status = 'reading';
    update public.book_clubs set updated_at = now() where id = new.club_id;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_single_active_club_read() from public, anon, authenticated;
grant execute on function public.enforce_single_active_club_read() to service_role;

drop trigger if exists single_active_club_read on public.book_club_reads;
create trigger single_active_club_read
before insert or update of status, club_id, book_id on public.book_club_reads
for each row execute function public.enforce_single_active_club_read();

create unique index if not exists book_club_reads_one_active_idx
  on public.book_club_reads (club_id) where status = 'reading';

notify pgrst, 'reload schema';
