-- Storefront features that already had tables: payment flags, service booking, review moderation.

grant execute on function public.create_service_booking(integer, date, time, text, text, text)
  to anon, authenticated;

alter table public.services enable row level security;
alter table public.bookings enable row level security;

drop policy if exists services_public_select on public.services;
create policy services_public_select on public.services
  for select to anon, authenticated using (true);

drop policy if exists services_staff_write on public.services;
create policy services_staff_write on public.services
  for all to authenticated
  using (public.is_catalogue_staff())
  with check (public.is_catalogue_staff());

drop policy if exists bookings_staff_select on public.bookings;
create policy bookings_staff_select on public.bookings
  for select to authenticated using (public.is_staff());

drop policy if exists bookings_staff_update on public.bookings;
create policy bookings_staff_update on public.bookings
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists bookings_own_select on public.bookings;
create policy bookings_own_select on public.bookings
  for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists customer_reviews_staff_delete on public.customer_reviews;
create policy customer_reviews_staff_delete on public.customer_reviews
  for delete to authenticated using (public.is_staff());
