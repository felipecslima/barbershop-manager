-- Barbershop domain: services, clients, appointments

-- Services offered by the barbershop
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  duration_minutes integer not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients (customers) of the barbershop
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Appointment status type
do $$ begin
  create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

-- Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  barber_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_services_organization_id on public.services (organization_id);
create index if not exists idx_services_active on public.services (organization_id, active);
create index if not exists idx_clients_organization_id on public.clients (organization_id);
create index if not exists idx_appointments_organization_id on public.appointments (organization_id);
create index if not exists idx_appointments_scheduled_at on public.appointments (organization_id, scheduled_at);
create index if not exists idx_appointments_client_id on public.appointments (client_id);
create index if not exists idx_appointments_barber_id on public.appointments (barber_id);
create index if not exists idx_appointments_status on public.appointments (organization_id, status);

-- Updated_at triggers
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- RLS
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

revoke all on public.services from anon, authenticated;
revoke all on public.clients from anon, authenticated;
revoke all on public.appointments from anon, authenticated;

grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;

-- Services policies: any active member reads, only write:all writes
create policy services_select_member
on public.services for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = services.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy services_insert_admin
on public.services for insert to authenticated
with check (
  public.has_permission(auth.uid(), 'write:all', services.organization_id)
);

create policy services_update_admin
on public.services for update to authenticated
using (public.has_permission(auth.uid(), 'write:all', services.organization_id))
with check (public.has_permission(auth.uid(), 'write:all', services.organization_id));

create policy services_delete_admin
on public.services for delete to authenticated
using (public.has_permission(auth.uid(), 'write:all', services.organization_id));

-- Clients policies: any active member reads/writes
create policy clients_select_member
on public.clients for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy clients_insert_member
on public.clients for insert to authenticated
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy clients_update_member
on public.clients for update to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = clients.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy clients_delete_admin
on public.clients for delete to authenticated
using (public.has_permission(auth.uid(), 'write:all', clients.organization_id));

-- Appointments policies: any active member reads/writes
create policy appointments_select_member
on public.appointments for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = appointments.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy appointments_insert_member
on public.appointments for insert to authenticated
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = appointments.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy appointments_update_member
on public.appointments for update to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = appointments.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = appointments.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy appointments_delete_admin
on public.appointments for delete to authenticated
using (public.has_permission(auth.uid(), 'write:all', appointments.organization_id));
