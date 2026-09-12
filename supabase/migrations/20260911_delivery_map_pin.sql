ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision;

CREATE OR REPLACE FUNCTION public.create_checkout_order_with_map(
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
  p_transaction_id text DEFAULT NULL,
  p_delivery_lat double precision DEFAULT NULL,
  p_delivery_lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_order_id integer;
  v_requires_address boolean;
BEGIN
  SELECT requires_address INTO v_requires_address
  FROM public.delivery_options
  WHERE id = p_delivery_option_id AND active = true;

  IF v_requires_address IS TRUE THEN
    IF p_delivery_lat IS NULL OR p_delivery_lng IS NULL THEN
      RAISE EXCEPTION 'Drop a pin on the map for your delivery location';
    END IF;
    IF p_delivery_lat < -5.1 OR p_delivery_lat > 5.7
       OR p_delivery_lng < 33.5 OR p_delivery_lng > 42.1 THEN
      RAISE EXCEPTION 'That map pin is outside Kenya';
    END IF;
  END IF;

  v_result := public.create_checkout_order(
    p_first_name,
    p_last_name,
    p_phone,
    p_email,
    p_delivery_option_id,
    p_delivery_address,
    p_city,
    p_payment_method,
    p_items,
    p_gift_message,
    p_transaction_id
  );

  v_order_id := (v_result->>'order_id')::integer;

  IF v_order_id IS NOT NULL AND v_requires_address IS TRUE THEN
    UPDATE public.orders
    SET
      delivery_lat = p_delivery_lat,
      delivery_lng = p_delivery_lng,
      notes = coalesce(notes, '') || E'\nMap pin: ' || p_delivery_lat::text || ', ' || p_delivery_lng::text
    WHERE id = v_order_id;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_checkout_order_with_map(
  text, text, text, text, integer, text, text, text, jsonb, text, text, double precision, double precision
) TO anon, authenticated, service_role;
