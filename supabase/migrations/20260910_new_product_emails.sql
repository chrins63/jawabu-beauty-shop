alter table public.newsletter_subscribers
  add column if not exists name text,
  add column if not exists source text not null default 'home',
  add column if not exists opted_in boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.email_outbox (
  id bigint generated always as identity primary key,
  email text not null,
  kind text not null default 'new_product',
  status text not null default 'queued',
  related_product_id integer,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_response text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists email_outbox_new_product_email_unique
  on public.email_outbox (related_product_id, email)
  where kind = 'new_product' and related_product_id is not null;

create index if not exists email_outbox_status_idx
  on public.email_outbox (status, created_at);

alter table public.email_outbox enable row level security;

drop policy if exists email_outbox_staff_select on public.email_outbox;
create policy email_outbox_staff_select
  on public.email_outbox
  for select
  to authenticated
  using (public.is_staff());

revoke all on public.email_outbox from public, anon;
grant select on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;
grant usage, select, update on sequence public.email_outbox_id_seq to service_role;

create or replace function public.subscribe_to_email(
  p_email text,
  p_name text default null,
  p_source text default 'checkout'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  normalized text;
  source_value text;
begin
  normalized := lower(trim(coalesce(p_email, '')));

  if normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid email address.');
  end if;

  source_value := coalesce(nullif(trim(p_source), ''), 'checkout');

  insert into public.newsletter_subscribers (email, name, source, opted_in)
  values (
    normalized,
    nullif(trim(p_name), ''),
    source_value,
    true
  )
  on conflict (email) do update
    set name = coalesce(excluded.name, public.newsletter_subscribers.name),
        source = excluded.source,
        opted_in = true,
        updated_at = now();

  return jsonb_build_object('ok', true, 'email', normalized);
end;
$function$;

revoke all on function public.subscribe_to_email(text, text, text) from public;
grant execute on function public.subscribe_to_email(text, text, text) to anon, authenticated, service_role;

create or replace function public.enqueue_new_product_alerts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  store_url text;
  product_url text;
  sub record;
  body text;
begin
  if not public.sms_setting_enabled('new_product_alerts_enabled', true) then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.active is not distinct from true then
    return new;
  end if;

  if new.active is not true then
    return new;
  end if;

  store_url := rtrim(public.sms_store_url(), '/');
  product_url := store_url || '/product/' || new.id::text;
  body := format(
    'New at Sleek Sisters: %s. See it here %s Look good. Stay sleek.',
    left(coalesce(new.name, 'a new product'), 60),
    product_url
  );

  for sub in
    select phone from public.sms_subscribers where opted_in = true
  loop
    insert into public.sms_outbox (phone, message, kind, related_product_id)
    values (sub.phone, body, 'new_product', new.id)
    on conflict do nothing;
  end loop;

  begin
    for sub in
      select email, name
      from public.newsletter_subscribers
      where opted_in = true
        and coalesce(email, '') <> ''
    loop
      insert into public.email_outbox (
        email, kind, related_product_id, subject, payload
      )
      values (
        sub.email,
        'new_product',
        new.id,
        'New at Sleek Sisters: ' || left(coalesce(new.name, 'a new product'), 80),
        jsonb_build_object(
          'name', coalesce(new.name, 'a new product'),
          'price', new.price,
          'url', product_url,
          'image_url', coalesce(new.image_url, ''),
          'description', left(coalesce(new.description, ''), 180)
        )
      )
      on conflict do nothing;
    end loop;
  exception
    when others then
      raise warning 'new product email queue failed: %', sqlerrm;
  end;

  return new;
end;
$function$;
