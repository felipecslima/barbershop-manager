-- =====================================================
-- GARANTIR QUE UM USUÁRIO SEJA SEMPRE ADMIN
-- =====================================================

-- Função para forçar role admin
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
  -- Buscar email do usuário
select lower(p.email)
into v_email
from public.profiles p
where p.id = new.user_id;

-- Se for o usuário específico
if v_email = 'lfj182@gmail.com' then

    -- Buscar role admin
select r.id
into v_admin_role_id
from public.roles r
where r.name = 'admin';

-- Segurança: garantir que role existe
if v_admin_role_id is null then
      raise exception 'Role admin not found. Ensure roles seed has been executed.';
end if;

    -- Forçar admin + ativo
    new.role_id := v_admin_role_id;
    new.status := 'active';
end if;

return new;
end;
$$;

-- =====================================================
-- TRIGGER
-- =====================================================

drop trigger if exists trg_enforce_admin_membership_for_lfj182 on public.memberships;

create trigger trg_enforce_admin_membership_for_lfj182
    before insert or update on public.memberships
                         for each row
                         execute function public.enforce_admin_membership_for_lfj182();


-- =====================================================
-- BACKFILL (CORREÇÃO DOS DADOS EXISTENTES)
-- =====================================================

update public.memberships m
set role_id = r.id,
    status = 'active',
    updated_at = now()
    from public.roles r,
     public.profiles p
where r.name = 'admin'
  and p.id = m.user_id
  and lower(p.email) = 'lfj182@gmail.com'
  and m.role_id is distinct from r.id;


-- =====================================================
-- (OPCIONAL) GARANTIR QUE O USUÁRIO TENHA MEMBERSHIP
-- EM TODAS AS ORGANIZAÇÕES
-- =====================================================

insert into public.memberships (user_id, organization_id, role_id, status)
select
    p.id,
    o.id,
    r.id,
    'active'
from public.profiles p
         cross join public.organizations o
         join public.roles r on r.name = 'admin'
where lower(p.email) = 'lfj182@gmail.com'
  and not exists (
    select 1
    from public.memberships m
    where m.user_id = p.id
      and m.organization_id = o.id
);
