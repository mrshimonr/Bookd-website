grant usage on schema public to anon, authenticated;

grant select on table public.businesses, public.services, public.availability to anon;

grant select, insert, update, delete on table
  public.profiles,
  public.businesses,
  public.business_members,
  public.services,
  public.customers,
  public.availability,
  public.bookings,
  public.loyalty_transactions
to authenticated;

grant execute on function public.is_business_member(uuid) to anon, authenticated;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_business() to authenticated;
