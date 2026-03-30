-- Garantir que lfj182@gmail.com seja sempre admin em qualquer organização.

create or replace function public.enforce_admin_membership_for_lfj182()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_admin_role_id uuid;
begin
  select lower(p.email) into v_email
  from public.profiles p
  where p.id = new.user_id;

  if v_email = 'lfj182@gmail.com' then
    select r.id into v_admin_role_id
    from public.roles r
    where r.name = 'admin';

    if v_admin_role_id is null then
      raise exception 'Role admin not found. Ensure roles seed has been executed.';
    end if;

    new.role_id := v_admin_role_id;
    new.status := 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_admin_membership_for_lfj182 on public.memberships;
create trigger trg_enforce_admin_membership_for_lfj182
before insert or update on public.memberships
for each row
execute function public.enforce_admin_membership_for_lfj182();

-- Backfill das memberships já existentes do usuário.
update public.memberships m
set role_id = r.id,
    status = 'active',
    updated_at = now()
from public.roles r
join public.profiles p on p.id = m.user_id
where r.name = 'admin'
  and lower(p.email) = 'lfj182@gmail.com'
  and m.role_id <> r.id;
