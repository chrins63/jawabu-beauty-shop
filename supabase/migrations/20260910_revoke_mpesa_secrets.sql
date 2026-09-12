revoke all on function public.get_mpesa_provider_secrets() from public, anon, authenticated;
grant execute on function public.get_mpesa_provider_secrets() to service_role;

revoke all on function public.complete_mpesa_stk(text, text, integer, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_mpesa_stk(text, text, integer, text, text, jsonb) to service_role;

revoke all on function public.prepare_mpesa_stk(integer, text, text) from public, anon, authenticated;
grant execute on function public.prepare_mpesa_stk(integer, text, text) to service_role;

revoke all on function public.save_mpesa_stk_request(integer, text, text) from public, anon, authenticated;
grant execute on function public.save_mpesa_stk_request(integer, text, text) to service_role;
