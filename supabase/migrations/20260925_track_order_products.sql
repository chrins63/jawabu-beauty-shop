-- Guest order tracking returns the products that were bought, including the photo and variant.

CREATE OR REPLACE FUNCTION public.track_guest_order(p_order_number text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_ref text;
  v_order public.orders%ROWTYPE;
  v_items jsonb;
BEGIN
  v_phone := public.normalize_ke_phone(p_phone);
  v_ref := upper(trim(coalesce(p_order_number, '')));

  IF v_phone IS NULL OR v_ref = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter your order number and the phone used at checkout.');
  END IF;

  SELECT * INTO v_order
  FROM public.orders o
  WHERE public.normalize_ke_phone(o.phone) = v_phone
    AND (
      upper(o.order_number) = v_ref
      OR (
        v_ref ~ '^[0-9]+$'
        AND o.id = v_ref::integer
      )
    )
  ORDER BY o.id DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No order matched that number and phone. Check both and try again.'
    );
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'product_id', oi.product_id,
    'name', coalesce(p.name, 'Item'),
    'image', coalesce(nullif(p.image_url, ''), ''),
    'variant_label', coalesce(oi.variant_label, ''),
    'quantity', oi.quantity,
    'price', oi.price_at_purchase
  ) ORDER BY oi.id), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'payment_status', v_order.payment_status,
      'payment_method', v_order.payment_method,
      'first_name', v_order.first_name,
      'fulfillment_type', v_order.fulfillment_type,
      'city', v_order.city,
      'delivery_address', v_order.delivery_address,
      'delivery_lat', v_order.delivery_lat,
      'delivery_lng', v_order.delivery_lng,
      'delivery_fee', v_order.delivery_fee,
      'total_amount', v_order.total_amount,
      'gift_message', v_order.gift_message,
      'created_at', v_order.created_at,
      'rider_opened_at', v_order.rider_opened_at,
      'dispatched_at', v_order.dispatched_at,
      'items', v_items
    )
  );
END;
$function$;
