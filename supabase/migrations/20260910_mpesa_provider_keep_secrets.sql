create or replace function public.save_mpesa_provider(
  p_environment text,
  p_consumer_key text,
  p_consumer_secret text,
  p_shortcode text,
  p_passkey text,
  p_party_type text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_env text;
  v_type text;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can save M-Pesa settings';
  end if;

  v_env := case
    when lower(trim(coalesce(p_environment, ''))) = 'production' then 'production'
    else 'sandbox'
  end;
  v_type := case
    when lower(trim(coalesce(p_party_type, ''))) = 'paybill' then 'paybill'
    else 'till'
  end;

  insert into private.mpesa_provider_config (
    id, environment, consumer_key, consumer_secret, shortcode, passkey, party_type, updated_at
  )
  values (
    1,
    v_env,
    case
      when coalesce(trim(p_consumer_key), '') = '' then (
        select consumer_key from private.mpesa_provider_config where id = 1
      )
      else trim(p_consumer_key)
    end,
    case
      when coalesce(trim(p_consumer_secret), '') = '' then (
        select consumer_secret from private.mpesa_provider_config where id = 1
      )
      else trim(p_consumer_secret)
    end,
    case
      when coalesce(trim(p_shortcode), '') = '' then (
        select shortcode from private.mpesa_provider_config where id = 1
      )
      else trim(p_shortcode)
    end,
    case
      when coalesce(trim(p_passkey), '') = '' then (
        select passkey from private.mpesa_provider_config where id = 1
      )
      else trim(p_passkey)
    end,
    v_type,
    now()
  )
  on conflict (id) do update
    set environment = excluded.environment,
        consumer_key = excluded.consumer_key,
        consumer_secret = excluded.consumer_secret,
        shortcode = excluded.shortcode,
        passkey = excluded.passkey,
        party_type = excluded.party_type,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.save_mpesa_provider(text, text, text, text, text, text) from public, anon;
grant execute on function public.save_mpesa_provider(text, text, text, text, text, text) to authenticated, service_role;
