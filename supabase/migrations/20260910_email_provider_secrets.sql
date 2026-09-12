-- Sleek Sisters mailbox: private SMTP config plus staff-safe status/save RPCs.
-- Edge Functions read the password only through service_role.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.email_provider_config (
  id integer primary key default 1 check (id = 1),
  from_name text,
  from_email text,
  smtp_host text,
  smtp_port integer default 465,
  username text,
  password text,
  admin_login_url text,
  updated_at timestamptz not null default now()
);

insert into private.email_provider_config (
  id, from_name, from_email, smtp_host, smtp_port
)
values (
  1, 'Sleek Sisters', 'hello@sleeksisters.com', 'smtp.gmail.com', 465
)
on conflict (id) do nothing;

revoke all on table private.email_provider_config from public, anon, authenticated;
grant select, insert, update on table private.email_provider_config to service_role;

alter table private.email_provider_config enable row level security;

create or replace function public.get_email_provider_status()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  cfg private.email_provider_config%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Only staff can view email settings';
  end if;

  select * into cfg from private.email_provider_config where id = 1;

  return jsonb_build_object(
    'configured',
      coalesce(cfg.smtp_host, '') <> ''
      and coalesce(cfg.username, '') <> ''
      and coalesce(cfg.password, '') <> ''
      and coalesce(cfg.from_email, '') <> '',
    'from_name', coalesce(cfg.from_name, 'Sleek Sisters'),
    'from_email', coalesce(cfg.from_email, ''),
    'smtp_host', coalesce(cfg.smtp_host, 'smtp.gmail.com'),
    'smtp_port', coalesce(cfg.smtp_port, 465),
    'username', coalesce(cfg.username, ''),
    'admin_login_url', coalesce(cfg.admin_login_url, '')
  );
end;
$$;

revoke all on function public.get_email_provider_status() from public, anon;
grant execute on function public.get_email_provider_status() to authenticated, service_role;

create or replace function public.save_email_provider(
  p_from_name text,
  p_from_email text,
  p_smtp_host text,
  p_smtp_port integer,
  p_username text,
  p_password text,
  p_admin_login_url text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can save email settings';
  end if;

  insert into private.email_provider_config (
    id, from_name, from_email, smtp_host, smtp_port, username, password, admin_login_url, updated_at
  )
  values (
    1,
    nullif(trim(p_from_name), ''),
    nullif(trim(p_from_email), ''),
    nullif(trim(p_smtp_host), ''),
    coalesce(nullif(p_smtp_port, 0), 465),
    nullif(trim(p_username), ''),
    case
      when coalesce(trim(p_password), '') = '' then (
        select password from private.email_provider_config where id = 1
      )
      else trim(p_password)
    end,
    nullif(trim(p_admin_login_url), ''),
    now()
  )
  on conflict (id) do update
    set from_name = excluded.from_name,
        from_email = excluded.from_email,
        smtp_host = excluded.smtp_host,
        smtp_port = excluded.smtp_port,
        username = excluded.username,
        password = excluded.password,
        admin_login_url = excluded.admin_login_url,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.save_email_provider(text, text, text, integer, text, text, text) from public, anon;
grant execute on function public.save_email_provider(text, text, text, integer, text, text, text) to authenticated, service_role;

create or replace function public.get_email_provider_secrets()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  cfg private.email_provider_config%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Not allowed';
  end if;

  select * into cfg from private.email_provider_config where id = 1;

  return jsonb_build_object(
    'from_name', coalesce(cfg.from_name, 'Sleek Sisters'),
    'from_email', coalesce(cfg.from_email, ''),
    'smtp_host', coalesce(cfg.smtp_host, ''),
    'smtp_port', coalesce(cfg.smtp_port, 465),
    'username', coalesce(cfg.username, ''),
    'password', coalesce(cfg.password, ''),
    'admin_login_url', coalesce(cfg.admin_login_url, '')
  );
end;
$$;

revoke all on function public.get_email_provider_secrets() from public, anon, authenticated;
grant execute on function public.get_email_provider_secrets() to service_role;
