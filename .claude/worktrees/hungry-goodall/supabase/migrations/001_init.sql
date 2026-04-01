create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_organization_id on public.projects (organization_id);
create index if not exists idx_projects_owner_id on public.projects (owner_id);
create index if not exists idx_projects_org_owner on public.projects (organization_id, owner_id);
create index if not exists idx_audit_logs_organization_id on public.audit_logs (organization_id);
create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_table_name_record_id on public.audit_logs (table_name, record_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_org_id uuid;
begin
  v_actor_id := auth.uid();

  if tg_op = 'INSERT' then
    v_org_id := (to_jsonb(new) ->> 'organization_id')::uuid;
    insert into public.audit_logs (organization_id, actor_id, table_name, record_id, action, old_data, new_data)
    values (v_org_id, v_actor_id, tg_table_name, (to_jsonb(new) ->> 'id')::uuid, 'insert', null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    v_org_id := coalesce((to_jsonb(new) ->> 'organization_id')::uuid, (to_jsonb(old) ->> 'organization_id')::uuid);
    insert into public.audit_logs (organization_id, actor_id, table_name, record_id, action, old_data, new_data)
    values (v_org_id, v_actor_id, tg_table_name, (to_jsonb(new) ->> 'id')::uuid, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    v_org_id := (to_jsonb(old) ->> 'organization_id')::uuid;
    insert into public.audit_logs (organization_id, actor_id, table_name, record_id, action, old_data, new_data)
    values (v_org_id, v_actor_id, tg_table_name, (to_jsonb(old) ->> 'id')::uuid, 'delete', to_jsonb(old), null);
    return old;
  end if;

  return null;
end;
$$;

create trigger projects_audit_trigger
after insert or update or delete on public.projects
for each row execute function public.write_audit_log();
