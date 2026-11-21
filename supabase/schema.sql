-- Live public schema snapshot from jawabu-beauty-shop (lerdicfcjfbdxfbjgiri) on 2026-11-21.
-- Columns and constraints only. Functions, policies, and triggers stay in the live database
-- and in supabase/migrations. Do not replay those migrations on top of this file.

create table public.audit_logs (
  id bigint not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  description text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.bookings (
  id integer not null default nextval('bookings_id_seq'::regclass),
  user_id integer,
  service_id integer,
  booking_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  status text default 'pending'::text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  auth_user_id uuid,
  customer_name text,
  email text,
  phone text
);

create table public.cart (
  id integer not null default nextval('cart_id_seq'::regclass),
  user_id integer,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.cart_items (
  id integer not null default nextval('cart_items_id_seq'::regclass),
  user_id integer,
  product_id integer,
  quantity integer default 1,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.category (
  id integer not null default nextval('categories_id_seq'::regclass),
  name character varying(255) not null,
  description text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.contact_messages (
  id bigint not null,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamp with time zone not null default now()
);

create table public.customer_cart (
  id bigint not null,
  auth_user_id uuid not null,
  product_id integer not null,
  quantity integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  variant_id bigint,
  variant_label text
);

create table public.customer_reviews (
  id bigint not null,
  auth_user_id uuid not null,
  product_id integer not null,
  rating integer not null,
  comment text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.customer_wishlist (
  id bigint not null,
  auth_user_id uuid not null,
  product_id integer not null,
  created_at timestamp with time zone not null default now()
);

create table public.delivery_options (
  id integer not null,
  slug text not null,
  name text not null,
  description text not null default ''::text,
  eta text not null default ''::text,
  fee numeric(12,2) not null default 0,
  requires_address boolean not null default true,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.email_outbox (
  id bigint not null,
  email text not null,
  kind text not null default 'new_product'::text,
  status text not null default 'queued'::text,
  related_product_id integer,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_response text,
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone,
  related_order_id integer
);

create table public.homepage_media (
  id bigint not null,
  slot text not null,
  title text,
  subtitle text,
  image_url text not null,
  link_url text,
  alt_text text,
  sort_order integer not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.inventory_movements (
  id integer not null default nextval('inventory_movements_id_seq'::regclass),
  product_id integer not null,
  quantity integer not null,
  movement_type text not null,
  reference_type text,
  reference_id integer,
  notes text,
  created_by uuid,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.knex_migrations (
  id integer not null default nextval('knex_migrations_id_seq'::regclass),
  name character varying(255),
  batch integer,
  migration_time timestamp with time zone
);

create table public.knex_migrations_lock (
  index integer not null default nextval('knex_migrations_lock_index_seq'::regclass),
  is_locked integer
);

create table public.newsletter_subscribers (
  id bigint not null,
  email text not null,
  created_at timestamp with time zone not null default now(),
  name text,
  source text not null default 'home'::text,
  opted_in boolean not null default true,
  updated_at timestamp with time zone not null default now()
);

create table public.order_items (
  id numeric not null default nextval('order_items_id_seq'::regclass),
  order_id integer,
  product_id integer,
  quantity integer not null,
  price_at_purchase numeric(10,2) not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  variant_id bigint,
  variant_label text
);

create table public.order_status_history (
  id integer not null default nextval('order_status_history_id_seq'::regclass),
  order_id integer not null,
  status character varying(255) not null,
  changed_by integer,
  remarks text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.orders (
  id integer not null default nextval('orders_id_seq'::regclass),
  user_id integer,
  order_date timestamp with time zone default CURRENT_TIMESTAMP,
  total_amount numeric(10,2) not null,
  status text default 'pending'::text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  payment_status character varying(255) not null default 'pending'::character varying,
  payment_method character varying(255),
  transaction_id character varying(255),
  notes text,
  updated_by integer,
  first_name text,
  last_name text,
  phone text,
  email text,
  delivery_address text,
  city text,
  delivery_fee numeric not null default 0,
  sales_channel text default 'online'::text,
  sold_by uuid,
  order_number text not null,
  auth_user_id uuid,
  delivery_option_id integer,
  gift_message text,
  fulfillment_type text,
  delivery_lat double precision,
  delivery_lng double precision,
  rider_phone text,
  rider_token_hash text,
  rider_token_expires_at timestamp with time zone,
  rider_opened_at timestamp with time zone,
  dispatched_at timestamp with time zone
);

create table public.payments (
  id integer not null default nextval('payments_id_seq'::regclass),
  order_id integer,
  amount numeric(10,2) not null,
  payment_method character varying(255) not null,
  transaction_id character varying(255),
  status text default 'pending'::text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  checkout_request_id text,
  merchant_request_id text,
  phone text,
  result_desc text,
  mpesa_payload jsonb not null default '{}'::jsonb,
  stk_requested_at timestamp with time zone
);

create table public.permissions (
  id integer not null default nextval('permissions_id_seq'::regclass),
  code character varying(100) not null,
  name character varying(150) not null,
  description text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.product_variants (
  id bigint not null,
  product_id integer not null,
  option_type text not null,
  option_value text not null,
  sku text,
  price numeric,
  stock_quantity integer not null default 0,
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.products (
  id integer not null default nextval('products_id_seq'::regclass),
  name character varying(255) not null,
  description text,
  price numeric(10,2) not null,
  stock_quantity integer default 0,
  image_url character varying(255),
  category_id integer,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  sku character varying(100),
  barcode character varying(100),
  cost_price numeric(10,2),
  low_stock_threshold integer default 5,
  active boolean not null default true,
  category text
);

create table public.reviews (
  id integer not null default nextval('reviews_id_seq'::regclass),
  product_id integer,
  user_id integer,
  rating integer not null,
  comment text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.role_permissions (
  id integer not null default nextval('role_permissions_id_seq'::regclass),
  role text not null,
  permission_id integer not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.services (
  id integer not null default nextval('services_id_seq'::regclass),
  name character varying(255) not null,
  description text,
  duration_minutes integer not null,
  price numeric(10,2) not null,
  image_url character varying(255),
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.settings (
  id bigint not null,
  category text not null,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.sms_outbox (
  id bigint not null,
  phone text not null,
  message text not null,
  kind text not null,
  status text not null default 'queued'::text,
  related_order_id integer,
  related_product_id integer,
  provider_response text,
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone
);

create table public.sms_subscribers (
  id bigint not null,
  phone text not null,
  name text,
  source text not null default 'checkout'::text,
  opted_in boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.staff_profiles (
  id integer not null default nextval('staff_profiles_id_seq'::regclass),
  user_id uuid not null,
  first_name character varying(100) not null,
  last_name character varying(100) not null,
  phone character varying(50),
  role text not null default 'staff'::text,
  active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.system_settings (
  id bigint not null,
  category text not null,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.users (
  id integer not null default nextval('users_id_seq'::regclass),
  email character varying(255) not null,
  password_hash character varying(255) not null,
  role text default 'customer'::text,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

create table public.wishlists (
  id integer not null default nextval('wishlists_id_seq'::regclass),
  user_id integer,
  product_id integer,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP
);

-- Constraints from the live public schema.

alter table audit_logs add FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table audit_logs add PRIMARY KEY (id);
alter table bookings add CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])));
alter table bookings add FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table bookings add FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
alter table bookings add FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table bookings add PRIMARY KEY (id);
alter table cart add FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table cart add PRIMARY KEY (id);
alter table cart add UNIQUE (user_id);
alter table cart_items add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table cart_items add FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table cart_items add PRIMARY KEY (id);
alter table category add PRIMARY KEY (id);
alter table category add UNIQUE (name);
alter table contact_messages add PRIMARY KEY (id);
alter table customer_cart add CHECK ((quantity > 0));
alter table customer_cart add FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table customer_cart add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table customer_cart add FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
alter table customer_cart add PRIMARY KEY (id);
alter table customer_cart add UNIQUE NULLS NOT DISTINCT (auth_user_id, product_id, variant_id);
alter table customer_reviews add CHECK (((rating >= 1) AND (rating <= 5)));
alter table customer_reviews add FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table customer_reviews add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table customer_reviews add PRIMARY KEY (id);
alter table customer_reviews add UNIQUE (auth_user_id, product_id);
alter table customer_wishlist add FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table customer_wishlist add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table customer_wishlist add PRIMARY KEY (id);
alter table customer_wishlist add UNIQUE (auth_user_id, product_id);
alter table delivery_options add CHECK ((fee >= (0)::numeric));
alter table delivery_options add PRIMARY KEY (id);
alter table delivery_options add UNIQUE (slug);
alter table email_outbox add PRIMARY KEY (id);
alter table homepage_media add FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table homepage_media add FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table homepage_media add PRIMARY KEY (id);
alter table inventory_movements add CHECK ((movement_type = ANY (ARRAY['stock_received'::text, 'sale'::text, 'return'::text, 'adjustment'::text, 'damage'::text, 'loss'::text])));
alter table inventory_movements add FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table inventory_movements add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table inventory_movements add PRIMARY KEY (id);
alter table knex_migrations add PRIMARY KEY (id);
alter table knex_migrations_lock add PRIMARY KEY (index);
alter table newsletter_subscribers add PRIMARY KEY (id);
alter table newsletter_subscribers add UNIQUE (email);
alter table order_items add FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table order_items add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table order_items add FOREIGN KEY (variant_id) REFERENCES product_variants(id);
alter table order_items add PRIMARY KEY (id);
alter table order_status_history add FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
alter table order_status_history add FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table order_status_history add PRIMARY KEY (id);
alter table orders add CHECK (((payment_status IS NULL) OR ((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'unpaid'::character varying, 'refunded'::character varying, 'failed'::character varying])::text[]))));
alter table orders add CHECK ((sales_channel = ANY (ARRAY['online'::text, 'physical'::text])));
alter table orders add CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'delivered'::text, 'cancelled'::text])));
alter table orders add FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table orders add FOREIGN KEY (delivery_option_id) REFERENCES delivery_options(id);
alter table orders add FOREIGN KEY (sold_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table orders add FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
alter table orders add FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table orders add PRIMARY KEY (id);
alter table payments add CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'completed'::text, 'failed'::text, 'refunded'::text])));
alter table payments add FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table payments add PRIMARY KEY (id);
alter table permissions add PRIMARY KEY (id);
alter table permissions add UNIQUE (code);
alter table product_variants add CHECK ((option_type = ANY (ARRAY['color'::text, 'size'::text])));
alter table product_variants add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table product_variants add PRIMARY KEY (id);
alter table product_variants add UNIQUE (product_id, option_type, option_value);
alter table products add FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL;
alter table products add PRIMARY KEY (id);
alter table reviews add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table reviews add FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table reviews add PRIMARY KEY (id);
alter table role_permissions add CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])));
alter table role_permissions add FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
alter table role_permissions add PRIMARY KEY (id);
alter table role_permissions add UNIQUE (role, permission_id);
alter table services add PRIMARY KEY (id);
alter table settings add FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table settings add PRIMARY KEY (id);
alter table settings add UNIQUE (category, setting_key);
alter table sms_outbox add CHECK ((kind = ANY (ARRAY['payment_thanks'::text, 'new_product'::text, 'test'::text])));
alter table sms_outbox add CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text, 'skipped'::text])));
alter table sms_outbox add FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL;
alter table sms_outbox add FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table sms_outbox add PRIMARY KEY (id);
alter table sms_subscribers add PRIMARY KEY (id);
alter table sms_subscribers add UNIQUE (phone);
alter table staff_profiles add CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])));
alter table staff_profiles add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table staff_profiles add PRIMARY KEY (id);
alter table staff_profiles add UNIQUE (user_id);
alter table system_settings add FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table system_settings add PRIMARY KEY (id);
alter table system_settings add UNIQUE (category, setting_key);
alter table users add CHECK ((role = ANY (ARRAY['customer'::text, 'admin'::text])));
alter table users add PRIMARY KEY (id);
alter table users add UNIQUE (email);
alter table wishlists add FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table wishlists add FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table wishlists add PRIMARY KEY (id);
