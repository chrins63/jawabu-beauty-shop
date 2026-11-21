-- Saved bags keep one row per product and variant, so two colours do not collapse into one line.

alter table public.customer_cart
  add column if not exists variant_id bigint references public.product_variants(id) on delete cascade,
  add column if not exists variant_label text;

alter table public.customer_cart
  drop constraint if exists customer_cart_auth_user_id_product_id_key;

alter table public.customer_cart
  drop constraint if exists customer_cart_user_product_variant_key;

alter table public.customer_cart
  add constraint customer_cart_user_product_variant_key
  unique nulls not distinct (auth_user_id, product_id, variant_id);
