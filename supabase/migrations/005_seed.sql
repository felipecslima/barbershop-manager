insert into public.roles (name, description)
values
  ('admin', 'Organization administrator with full access'),
  ('manager', 'Organization manager with broad access'),
  ('user', 'Standard organization user with own-scope access')
on conflict (name) do update
set description = excluded.description,
    updated_at = now();

insert into public.permissions (name, description)
values
  ('read:all', 'Read all organization resources'),
  ('write:all', 'Create, update, and delete all organization resources'),
  ('read:own', 'Read only owned resources'),
  ('write:own', 'Create, update, and delete only owned resources')
on conflict (name) do update
set description = excluded.description,
    updated_at = now();

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.name = 'admin' and p.name in ('read:all', 'write:all', 'read:own', 'write:own'))
  or (r.name = 'manager' and p.name in ('read:all', 'write:own', 'read:own'))
  or (r.name = 'user' and p.name in ('read:own', 'write:own'))
)
on conflict (role_id, permission_id) do nothing;
