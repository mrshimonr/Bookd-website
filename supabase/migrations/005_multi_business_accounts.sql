drop policy if exists "owners delete business" on public.businesses;
create policy "owners delete business" on public.businesses
for delete using (owner_id = auth.uid());
