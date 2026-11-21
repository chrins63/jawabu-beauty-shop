-- M-Pesa completion stores payments.status as paid. The old check only allowed completed.

alter table public.payments drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (status = any (array['pending'::text, 'paid'::text, 'completed'::text, 'failed'::text, 'refunded'::text]));
