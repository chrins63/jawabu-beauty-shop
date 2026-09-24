-- One confirmation email and one SMS per order. Guests cannot read the outbox.

alter table public.email_outbox
  add column if not exists related_order_id integer;

create unique index if not exists email_outbox_order_confirmation_unique
  on public.email_outbox (related_order_id)
  where kind = 'order_confirmation' and related_order_id is not null;

create unique index if not exists sms_outbox_order_confirmation_unique
  on public.sms_outbox (related_order_id)
  where kind = 'order_confirmation' and related_order_id is not null;
