-- New sb_secret_* API keys do not populate the legacy request.jwt.claim.role
-- setting. Use the effective Postgres role, and keep the function invoker-safe
-- so current_user reflects the Data API caller rather than the function owner.
create or replace function private.protect_profile_admin_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'service_role'
     and (new.is_verified, new.verification_label, new.verified_at, new.verified_by,
          new.banned_at, new.banned_until, new.banned_by, new.ban_reason)
         is distinct from
         (old.is_verified, old.verification_label, old.verified_at, old.verified_by,
          old.banned_at, old.banned_until, old.banned_by, old.ban_reason) then
    raise exception 'Admin-owned profile fields cannot be changed by this role';
  end if;
  return new;
end
$$;

revoke execute on function private.protect_profile_admin_fields() from public, anon, authenticated;
