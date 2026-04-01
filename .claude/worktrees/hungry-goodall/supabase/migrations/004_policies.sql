alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.projects enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.organizations from anon, authenticated;
revoke all on public.memberships from anon, authenticated;
revoke all on public.roles from anon, authenticated;
revoke all on public.permissions from anon, authenticated;
revoke all on public.role_permissions from anon, authenticated;
revoke all on public.projects from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select on public.audit_logs to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy organizations_select_member
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy organizations_insert_authenticated
on public.organizations
for insert
to authenticated
with check (
  created_by = auth.uid()
);

create policy organizations_update_admin
on public.organizations
for update
to authenticated
using (
  public.has_permission(auth.uid(), 'write:all', organizations.id)
)
with check (
  public.has_permission(auth.uid(), 'write:all', organizations.id)
);

create policy organizations_delete_admin
on public.organizations
for delete
to authenticated
using (
  public.has_permission(auth.uid(), 'write:all', organizations.id)
);

create policy memberships_select_own_or_admin
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_permission(auth.uid(), 'read:all', memberships.organization_id)
);

create policy memberships_insert_admin
on public.memberships
for insert
to authenticated
with check (
  public.has_permission(auth.uid(), 'write:all', memberships.organization_id)
);

create policy memberships_update_admin
on public.memberships
for update
to authenticated
using (
  public.has_permission(auth.uid(), 'write:all', memberships.organization_id)
)
with check (
  public.has_permission(auth.uid(), 'write:all', memberships.organization_id)
);

create policy memberships_delete_admin
on public.memberships
for delete
to authenticated
using (
  public.has_permission(auth.uid(), 'write:all', memberships.organization_id)
);

create policy roles_select_member
on public.roles
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy permissions_select_member
on public.permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy role_permissions_select_member
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy projects_select_member_with_own_or_all
on public.projects
for select
to authenticated
using (
  (
    public.has_permission(auth.uid(), 'read:all', projects.organization_id)
    and exists (
      select 1
      from public.memberships m
      where m.organization_id = projects.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
  or (
    public.has_permission(auth.uid(), 'read:own', projects.organization_id)
    and projects.owner_id = auth.uid()
    and exists (
      select 1
      from public.memberships m
      where m.organization_id = projects.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

create policy projects_insert_member_with_permission
on public.projects
for insert
to authenticated
with check (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = projects.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  and (
    public.has_permission(auth.uid(), 'write:all', projects.organization_id)
    or (
      public.has_permission(auth.uid(), 'write:own', projects.organization_id)
      and projects.owner_id = auth.uid()
    )
  )
);

create policy projects_update_member_with_permission
on public.projects
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = projects.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  and (
    public.has_permission(auth.uid(), 'write:all', projects.organization_id)
    or (
      public.has_permission(auth.uid(), 'write:own', projects.organization_id)
      and projects.owner_id = auth.uid()
    )
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = projects.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  and (
    public.has_permission(auth.uid(), 'write:all', projects.organization_id)
    or (
      public.has_permission(auth.uid(), 'write:own', projects.organization_id)
      and projects.owner_id = auth.uid()
    )
  )
);

create policy projects_delete_member_with_permission
on public.projects
for delete
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = projects.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  and (
    public.has_permission(auth.uid(), 'write:all', projects.organization_id)
    or (
      public.has_permission(auth.uid(), 'write:own', projects.organization_id)
      and projects.owner_id = auth.uid()
    )
  )
);

create policy audit_logs_select_member
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = audit_logs.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and public.has_permission(auth.uid(), 'read:all', audit_logs.organization_id)
  )
);
