-- Product options (colour / size) controlled by admin.
-- Each option has its own stock, price, photo, and available flag.

CREATE TABLE IF NOT EXISTS public.product_variants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id integer NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_type text NOT NULL CHECK (option_type IN ('color', 'size')),
  option_value text NOT NULL,
  sku text,
  price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, option_type, option_value)
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON public.product_variants (product_id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id bigint REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS variant_label text;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_public_select ON public.product_variants;
CREATE POLICY product_variants_public_select
  ON public.product_variants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS product_variants_staff_insert ON public.product_variants;
CREATE POLICY product_variants_staff_insert
  ON public.product_variants
  FOR INSERT
  WITH CHECK (public.is_catalogue_staff());

DROP POLICY IF EXISTS product_variants_staff_update ON public.product_variants;
CREATE POLICY product_variants_staff_update
  ON public.product_variants
  FOR UPDATE
  USING (public.is_catalogue_staff())
  WITH CHECK (public.is_catalogue_staff());

DROP POLICY IF EXISTS product_variants_staff_delete ON public.product_variants;
CREATE POLICY product_variants_staff_delete
  ON public.product_variants
  FOR DELETE
  USING (public.is_catalogue_staff());

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_variants_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_variants_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_product_variant_stock(p_product_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.product_variants WHERE product_id = p_product_id
  ) THEN
    UPDATE public.products
    SET stock_quantity = (
          SELECT coalesce(sum(stock_quantity), 0)
          FROM public.product_variants
          WHERE product_id = p_product_id
            AND available = true
        ),
        updated_at = now()
    WHERE id = p_product_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_product_variant_stock(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_product_variant_stock(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_delivery_option_id integer,
  p_delivery_address text,
  p_city text,
  p_payment_method text,
  p_items jsonb,
  p_gift_message text DEFAULT NULL,
  p_transaction_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id integer;
  v_order_number text;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product_id integer;
  v_variant_id bigint;
  v_quantity integer;
  v_price numeric;
  v_stock integer;
  v_label text;
  v_has_variants boolean;
  v_option public.delivery_options%ROWTYPE;
  v_address text;
  v_city text;
  v_phone text;
  v_notes text;
  v_fulfillment text;
  v_gift text;
BEGIN
  v_phone := public.normalize_ke_phone(p_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Enter a valid Kenyan phone number';
  END IF;

  IF nullif(trim(p_first_name), '') IS NULL
     OR nullif(trim(p_last_name), '') IS NULL
     OR nullif(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Name and email are required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  SELECT * INTO v_option
  FROM public.delivery_options
  WHERE id = p_delivery_option_id AND active = true;

  IF v_option.id IS NULL THEN
    RAISE EXCEPTION 'Choose a delivery option';
  END IF;

  v_delivery_fee := coalesce(v_option.fee, 0);
  v_fulfillment := CASE WHEN v_option.requires_address THEN 'delivery' ELSE 'pickup' END;
  v_gift := nullif(trim(p_gift_message), '');

  IF v_option.requires_address THEN
    v_address := nullif(trim(p_delivery_address), '');
    v_city := nullif(trim(p_city), '');
    IF v_address IS NULL OR v_city IS NULL THEN
      RAISE EXCEPTION 'Delivery address and town are required';
    END IF;
  ELSE
    v_address := coalesce(nullif(trim(p_delivery_address), ''), (
      SELECT coalesce(nullif(trim(setting_value #>> '{}'), ''), 'Nairobi')
      FROM public.settings
      WHERE category = 'general' AND setting_key = 'pickup_address'
      LIMIT 1
    ), 'Nairobi pickup');
    v_city := coalesce(nullif(trim(p_city), ''), 'Nairobi');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::integer;
    v_variant_id := nullif(v_item->>'variant_id', '')::bigint;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'Invalid product quantity';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.product_variants WHERE product_id = v_product_id
    ) INTO v_has_variants;

    IF v_has_variants THEN
      IF v_variant_id IS NULL THEN
        RAISE EXCEPTION 'Choose a colour or size for this product';
      END IF;

      SELECT
        coalesce(pv.price, p.price),
        pv.stock_quantity,
        pv.option_value
      INTO v_price, v_stock, v_label
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id
        AND pv.product_id = v_product_id
        AND pv.available = true
      FOR UPDATE OF pv;

      IF v_price IS NULL THEN
        RAISE EXCEPTION 'That colour or size is not available';
      END IF;
    ELSE
      SELECT price, stock_quantity INTO v_price, v_stock
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

      IF v_price IS NULL THEN
        RAISE EXCEPTION 'Product % does not exist', v_product_id;
      END IF;
    END IF;

    IF coalesce(v_stock, 0) < v_quantity THEN
      RAISE EXCEPTION 'Not enough stock for this option';
    END IF;

    v_subtotal := v_subtotal + (v_price * v_quantity);
  END LOOP;

  IF v_subtotal <= 0 THEN
    v_delivery_fee := 0;
  END IF;

  v_total := v_subtotal + v_delivery_fee;
  v_notes := 'Order placed on the Sleek Sisters shop · ' || v_option.name;
  IF v_gift IS NOT NULL THEN
    v_notes := v_notes || E'\nGift note: ' || v_gift;
  END IF;

  INSERT INTO public.orders (
    total_amount, status, payment_status, payment_method,
    first_name, last_name, phone, email, delivery_address, city,
    delivery_fee, notes, auth_user_id, sales_channel,
    delivery_option_id, gift_message, fulfillment_type
  ) VALUES (
    v_total, 'pending', 'pending',
    coalesce(nullif(trim(p_payment_method), ''), 'M-Pesa'),
    trim(p_first_name), trim(p_last_name), v_phone, trim(p_email),
    v_address, v_city, v_delivery_fee,
    v_notes,
    auth.uid(), 'online',
    v_option.id, v_gift, v_fulfillment
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::integer;
    v_variant_id := nullif(v_item->>'variant_id', '')::bigint;
    v_quantity := (v_item->>'quantity')::integer;
    v_label := NULL;

    SELECT EXISTS (
      SELECT 1 FROM public.product_variants WHERE product_id = v_product_id
    ) INTO v_has_variants;

    IF v_has_variants THEN
      SELECT
        coalesce(pv.price, p.price),
        pv.option_value
      INTO v_price, v_label
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id;

      INSERT INTO public.order_items (
        order_id, product_id, quantity, price_at_purchase, variant_id, variant_label
      ) VALUES (
        v_order_id, v_product_id, v_quantity, v_price, v_variant_id, v_label
      );

      UPDATE public.product_variants
      SET stock_quantity = stock_quantity - v_quantity,
          updated_at = now()
      WHERE id = v_variant_id;

      PERFORM public.sync_product_variant_stock(v_product_id);
    ELSE
      SELECT price INTO v_price FROM public.products WHERE id = v_product_id;

      INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
      VALUES (v_order_id, v_product_id, v_quantity, v_price);

      UPDATE public.products
      SET stock_quantity = stock_quantity - v_quantity, updated_at = now()
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  INSERT INTO public.payments (
    order_id, amount, payment_method, transaction_id, status, phone
  ) VALUES (
    v_order_id, v_total,
    coalesce(nullif(trim(p_payment_method), ''), 'M-Pesa'),
    nullif(trim(p_transaction_id), ''),
    'pending',
    v_phone
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'payment_status', 'pending',
    'delivery_name', v_option.name,
    'fulfillment_type', v_fulfillment
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pos_sale(p_order jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id bigint;
  v_item jsonb;
  v_product_id bigint;
  v_variant_id bigint;
  v_quantity int;
  v_price numeric;
  v_current_stock int;
  v_product_name text;
  v_label text;
  v_has_variants boolean;
  v_sold_by uuid;
  v_result jsonb;
BEGIN
  IF NOT public.is_catalogue_staff() THEN
    RAISE EXCEPTION 'Only active staff can record a POS sale';
  END IF;

  v_sold_by := auth.uid();

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF coalesce((p_order->>'total_amount')::numeric, -1) < 0
     OR coalesce((p_order->>'delivery_fee')::numeric, 0) < 0 THEN
    RAISE EXCEPTION 'Sale totals cannot be negative';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::bigint;
    v_variant_id := nullif(v_item->>'variant_id', '')::bigint;
    v_quantity := (v_item->>'quantity')::int;
    v_price := (v_item->>'price_at_purchase')::numeric;

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', v_product_id;
    END IF;

    IF v_price IS NULL OR v_price < 0 THEN
      RAISE EXCEPTION 'Invalid price for product %', v_product_id;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.product_variants WHERE product_id = v_product_id
    ) INTO v_has_variants;

    SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

    IF v_product_name IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;

    IF v_has_variants THEN
      IF v_variant_id IS NULL THEN
        RAISE EXCEPTION 'Choose a colour or size for %', v_product_name;
      END IF;

      SELECT stock_quantity, option_value
      INTO v_current_stock, v_label
      FROM public.product_variants
      WHERE id = v_variant_id
        AND product_id = v_product_id
        AND available = true
      FOR UPDATE;

      IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'That colour or size is not available for %', v_product_name;
      END IF;
    ELSE
      SELECT stock_quantity
      INTO v_current_stock
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Not enough stock for %. Available: %, requested: %',
        v_product_name, v_current_stock, v_quantity;
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    user_id, order_date, total_amount, status, payment_status,
    payment_method, transaction_id, notes, first_name, last_name,
    phone, email, delivery_address, city, delivery_fee,
    sales_channel, sold_by
  )
  VALUES (
    NULL,
    coalesce((p_order->>'order_date')::timestamptz, now()),
    (p_order->>'total_amount')::numeric,
    coalesce(p_order->>'status', 'delivered'),
    coalesce(p_order->>'payment_status', 'paid'),
    p_order->>'payment_method',
    nullif(p_order->>'transaction_id', ''),
    nullif(p_order->>'notes', ''),
    nullif(p_order->>'first_name', ''),
    nullif(p_order->>'last_name', ''),
    nullif(p_order->>'phone', ''),
    nullif(p_order->>'email', ''),
    nullif(p_order->>'delivery_address', ''),
    nullif(p_order->>'city', ''),
    (p_order->>'delivery_fee')::numeric,
    coalesce(p_order->>'sales_channel', 'physical'),
    v_sold_by
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::bigint;
    v_variant_id := nullif(v_item->>'variant_id', '')::bigint;
    v_quantity := (v_item->>'quantity')::int;
    v_price := (v_item->>'price_at_purchase')::numeric;
    v_label := NULL;

    SELECT EXISTS (
      SELECT 1 FROM public.product_variants WHERE product_id = v_product_id
    ) INTO v_has_variants;

    IF v_has_variants THEN
      SELECT option_value INTO v_label
      FROM public.product_variants
      WHERE id = v_variant_id;

      INSERT INTO public.order_items (
        order_id, product_id, quantity, price_at_purchase, variant_id, variant_label
      ) VALUES (
        v_order_id, v_product_id, v_quantity, v_price, v_variant_id, v_label
      );

      UPDATE public.product_variants
      SET stock_quantity = stock_quantity - v_quantity,
          updated_at = now()
      WHERE id = v_variant_id;

      PERFORM public.sync_product_variant_stock(v_product_id::integer);
    ELSE
      INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
      VALUES (v_order_id, v_product_id, v_quantity, v_price);

      UPDATE public.products
      SET stock_quantity = stock_quantity - v_quantity,
          updated_at = now()
      WHERE id = v_product_id;
    END IF;

    INSERT INTO public.inventory_movements (
      product_id, quantity, movement_type, reference_type,
      reference_id, notes, created_by
    )
    VALUES (
      v_product_id,
      v_quantity,
      'sale',
      'ORDER',
      v_order_id,
      CASE
        WHEN v_label IS NOT NULL THEN 'POS sale - Order #' || v_order_id || ' · ' || v_label
        ELSE 'POS sale - Order #' || v_order_id
      END,
      v_sold_by
    );
  END LOOP;

  INSERT INTO public.payments (order_id, amount, payment_method, transaction_id, status)
  VALUES (
    v_order_id,
    (p_order->>'total_amount')::numeric,
    p_order->>'payment_method',
    nullif(p_order->>'transaction_id', ''),
    'completed'
  );

  v_result := jsonb_build_object('order_id', v_order_id);
  RETURN v_result;
END;
$$;
