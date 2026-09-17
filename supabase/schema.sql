create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  category text not null check (category in ('services','appointments','events','transportation')),
  description text default '',
  timezone text not null default 'America/New_York',
  currency text not null default 'USD',
  language text not null default 'en',
  published boolean not null default false,
  marketplace_enabled boolean not null default false,
  loyalty_enabled boolean not null default false,
  theme jsonb not null default '{"color":"#4f46e5"}',
  created_at timestamptz not null default now()
);
create table if not exists public.business_members (
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','staff')),
  primary key (business_id,user_id)
);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, description text default '', duration_minutes int not null default 60,
  price_cents int not null default 0, deposit_cents int not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null, full_name text not null, email text, phone text,
  loyalty_points int not null default 0, notes text default '', created_at timestamptz not null default now()
);
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete cascade, weekday int not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null, enabled boolean not null default true
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id), customer_id uuid not null references public.customers(id),
  staff_id uuid references public.profiles(id), starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','authorized','paid','refunded')),
  deposit_cents int not null default 0,
  total_cents int not null default 0, stripe_payment_intent_id text, answers jsonb not null default '{}', notes text default '', created_at timestamptz not null default now()
);
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade, booking_id uuid references public.bookings(id) on delete set null,
  points int not null, reason text not null, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;alter table public.businesses enable row level security;alter table public.business_members enable row level security;alter table public.services enable row level security;alter table public.customers enable row level security;alter table public.availability enable row level security;alter table public.bookings enable row level security;alter table public.loyalty_transactions enable row level security;
create or replace function public.is_business_member(bid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from business_members where business_id=bid and user_id=auth.uid()) $$;
create policy "own profile" on public.profiles for all using(id=auth.uid()) with check(id=auth.uid());
create policy "business members read" on public.businesses for select using(public.is_business_member(id) or published=true);
create policy "owners create business" on public.businesses for insert with check(owner_id=auth.uid());
create policy "members manage business" on public.businesses for update using(public.is_business_member(id));
create policy "owners delete business" on public.businesses for delete using(owner_id=auth.uid());
create policy "members read membership" on public.business_members for select using(user_id=auth.uid() or public.is_business_member(business_id));
create policy "owners add membership" on public.business_members for insert with check(public.is_business_member(business_id));
create policy "services public read" on public.services for select using(active=true or public.is_business_member(business_id));
create policy "members manage services" on public.services for all using(public.is_business_member(business_id)) with check(public.is_business_member(business_id));
create policy "members manage customers" on public.customers for all using(public.is_business_member(business_id)) with check(public.is_business_member(business_id));
create policy "availability public read" on public.availability for select using(enabled=true or public.is_business_member(business_id));
create policy "members manage availability" on public.availability for all using(public.is_business_member(business_id)) with check(public.is_business_member(business_id));
create policy "members manage bookings" on public.bookings for all using(public.is_business_member(business_id)) with check(public.is_business_member(business_id));
create policy "members manage loyalty" on public.loyalty_transactions for all using(public.is_business_member(business_id)) with check(public.is_business_member(business_id));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name,avatar_url) values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'avatar_url') on conflict do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.handle_new_business() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.business_members(business_id,user_id,role) values(new.id,new.owner_id,'owner') on conflict do nothing; return new; end; $$;
drop trigger if exists on_business_created on public.businesses;create trigger on_business_created after insert on public.businesses for each row execute procedure public.handle_new_business();

grant usage on schema public to anon, authenticated;
grant select on table public.businesses, public.services, public.availability to anon;
grant select, insert, update, delete on table public.profiles, public.businesses, public.business_members, public.services, public.customers, public.availability, public.bookings, public.loyalty_transactions to authenticated;
grant execute on function public.is_business_member(uuid) to anon, authenticated;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_business() to authenticated;

insert into public.profiles (id, full_name, avatar_url)
select id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;
