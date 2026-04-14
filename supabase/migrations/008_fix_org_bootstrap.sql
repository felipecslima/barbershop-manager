-- ============================================================
-- FIX: Bootstrap de organização — chicken-and-egg entre
--      organizations_select_member e memberships_insert_admin
-- ============================================================
--
-- Problema:
--   1. INSERT org passa (created_by = auth.uid() ✓)
--   2. PostgREST tenta SELECT o row criado (Prefer: return=representation)
--   3. organizations_select_member exige membership ativa → falha → 42501
--   4. Sem membership, memberships_insert_admin também nega o INSERT → loop
--
-- Solução:
--   A. Trigger SECURITY DEFINER que cria membership admin automaticamente
--      após INSERT na organizations (bypassa RLS do trigger owner)
--   B. Ajustar organizations_select_member para incluir o creator,
--      resolvendo o problema do RETURNING antes de qualquer membership

-- ─── A. Trigger: auto-membership admin no INSERT de org ──────────────────────

create or replace function public.auto_admin_membership_on_org_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role_id uuid;
begin
  select id into v_admin_role_id
  from public.roles
  where name = 'admin'
  limit 1;

  if v_admin_role_id is null then
    raise exception 'Role "admin" não encontrada. Execute a seed primeiro.';
  end if;

  insert into public.memberships (user_id, organization_id, role_id, status)
  values (new.created_by, new.id, v_admin_role_id, 'active')
  on conflict (user_id, organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auto_admin_membership_on_org_create on public.organizations;

create trigger trg_auto_admin_membership_on_org_create
  after insert on public.organizations
  for each row
  execute function public.auto_admin_membership_on_org_create();

-- ─── B. Fix SELECT policy: creator sempre pode ver a própria org ─────────────
--       (resolve o RETURNING do PostgREST logo após o INSERT, antes do trigger
--        completar a escrita do membership no mesmo statement)

drop policy if exists organizations_select_member on public.organizations;

create policy organizations_select_member
on public.organizations
for select
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);
