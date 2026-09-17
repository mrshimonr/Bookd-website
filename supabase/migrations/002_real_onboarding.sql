alter table public.businesses add column if not exists theme jsonb not null default '{"color":"#4f46e5"}';
drop policy if exists "business members read" on public.businesses;
create policy "business members read" on public.businesses for select using(owner_id=auth.uid() or public.is_business_member(id) or published=true);
create or replace function public.handle_new_business() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.business_members(business_id,user_id,role) values(new.id,new.owner_id,'owner') on conflict do nothing; return new; end; $$;
drop trigger if exists on_business_created on public.businesses;
create trigger on_business_created after insert on public.businesses for each row execute procedure public.handle_new_business();
