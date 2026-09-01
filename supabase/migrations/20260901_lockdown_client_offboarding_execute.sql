revoke execute on function public.offboard_client_with_writeoff(uuid,text) from public;
revoke execute on function public.offboard_client_with_writeoff(uuid,text) from anon;
grant execute on function public.offboard_client_with_writeoff(uuid,text) to authenticated;