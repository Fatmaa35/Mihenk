create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_user_idx
on public.web_push_subscriptions(user_id);

alter table public.web_push_subscriptions enable row level security;
drop policy if exists web_push_subscriptions_select_own on public.web_push_subscriptions;
create policy web_push_subscriptions_select_own on public.web_push_subscriptions
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists web_push_subscriptions_insert_own on public.web_push_subscriptions;
create policy web_push_subscriptions_insert_own on public.web_push_subscriptions
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists web_push_subscriptions_update_own on public.web_push_subscriptions;
create policy web_push_subscriptions_update_own on public.web_push_subscriptions
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists web_push_subscriptions_delete_own on public.web_push_subscriptions;
create policy web_push_subscriptions_delete_own on public.web_push_subscriptions
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.web_push_subscriptions from anon;
grant select,delete on public.web_push_subscriptions to authenticated;
grant all on public.web_push_subscriptions to service_role;

create or replace function public.save_web_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns table(id uuid, endpoint text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare
  owner_id uuid := (select auth.uid());
begin
  if owner_id is null then raise exception 'authentication required'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) not between 20 and 4000
     or length(p_p256dh) not between 20 and 1000
     or length(p_auth) not between 8 and 500 then
    raise exception 'invalid push subscription';
  end if;
  delete from public.web_push_subscriptions s
  where s.endpoint = p_endpoint and s.user_id <> owner_id;
  return query
  insert into public.web_push_subscriptions as subscription(user_id,endpoint,p256dh,auth,user_agent)
  values(owner_id,p_endpoint,p_p256dh,p_auth,left(p_user_agent,500))
  on conflict(endpoint) do update set
    user_id=owner_id,p256dh=excluded.p256dh,auth=excluded.auth,
    user_agent=excluded.user_agent,updated_at=now()
  returning subscription.id,subscription.endpoint,
            subscription.created_at,subscription.updated_at;
end;
$$;

revoke all on function public.save_web_push_subscription(text,text,text,text) from public,anon;
grant execute on function public.save_web_push_subscription(text,text,text,text) to authenticated;
