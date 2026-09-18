alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
check (status in ('pending','confirmed','in_progress','completed','cancelled','no_show'));

alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
check (payment_status in ('unpaid','deposit_due','deposit_paid','paid','partially_refunded','refunded'));

alter table public.bookings add column if not exists deposit_cents integer not null default 0;
alter table public.customers add column if not exists custom_data jsonb not null default '{}';
alter table public.services add column if not exists custom_data jsonb not null default '{}';
alter table public.services add column if not exists deposit_cents integer not null default 0;
alter table public.businesses add column if not exists crm_settings jsonb not null default '{"week_starts_on":0,"visible_sections":["overview","calendar","bookings","services","customers","staff","loyalty","reports","payments","settings"]}';

create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  entity_type text not null check (entity_type in ('booking','customer','service')),
  label text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text','textarea','number','date','select','checkbox')),
  required boolean not null default false,
  visible boolean not null default true,
  display_order integer not null default 0,
  options jsonb not null default '[]',
  unique (business_id, entity_type, field_key)
);
alter table public.custom_fields enable row level security;
grant select, insert, update, delete on public.custom_fields to authenticated;
drop policy if exists "members manage custom fields" on public.custom_fields;
create policy "members manage custom fields" on public.custom_fields for all
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
