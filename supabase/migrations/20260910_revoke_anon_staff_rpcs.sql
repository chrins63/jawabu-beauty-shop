revoke all on function public.get_mpesa_provider_status() from public, anon;
grant execute on function public.get_mpesa_provider_status() to authenticated;

revoke all on function public.sync_product_category_name() from public, anon, authenticated;
grant execute on function public.sync_product_category_name() to service_role;

revoke all on function public.create_service_booking(integer, date, time, text, text, text) from public, anon, authenticated;
