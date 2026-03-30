create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index if not exists idx_memberships_user_id on public.memberships (user_id);
create index if not exists idx_memberships_organization_id on public.memberships (organization_id);
create index if not exists idx_memberships_role_id on public.memberships (role_id);
create index if not exists idx_memberships_user_org_status on public.memberships (user_id, organization_id, status);

create trigger set_memberships_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

create or replace function public.has_permission(p_user_id uuid, p_permission text, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = p_user_id
      and m.organization_id = p_organization_id
      and m.status = 'active'
      and p.name = p_permission
  );
$$;

create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = p_user_id
      and m.status = 'active'
      and p.name = p_permission
  );
$$;
