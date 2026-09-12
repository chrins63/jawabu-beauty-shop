grant execute on function public.is_staff() to anon;
grant execute on function public.is_manager() to anon;
grant execute on function public.is_owner() to anon;
grant execute on function public.is_shop_admin() to anon;
grant execute on function public.is_catalogue_staff() to anon;
grant execute on function public.has_permission(text) to anon;
grant execute on function public.current_staff_role() to anon;
grant execute on function public.get_my_staff_profile() to anon;
