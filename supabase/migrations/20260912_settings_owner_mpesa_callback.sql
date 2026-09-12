-- Lock public.settings writes to the owner, and harden M-Pesa STK completion:
-- callback secret, amount check, already-paid no-op.

-- ---------------------------------------------------------------------------
-- Settings: customers must not be able to rewrite store config
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS settings_insert_authenticated ON public.settings;
DROP POLICY IF EXISTS settings_update_authenticated ON public.settings;
DROP POLICY IF EXISTS settings_staff_write ON public.settings;

CREATE POLICY settings_owner_write
  ON public.settings
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_owner()))
  WITH CHECK ((SELECT public.is_owner()));

REVOKE ALL ON TABLE public.settings FROM anon, authenticated;
GRANT SELECT ON TABLE public.settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.settings TO authenticated;

-- ---------------------------------------------------------------------------
-- M-Pesa callback secret (Daraja has no JWT; token lives on CallBackURL)
-- ---------------------------------------------------------------------------

ALTER TABLE private.mpesa_provider_config
  ADD COLUMN IF NOT EXISTS callback_secret text;

UPDATE private.mpesa_provider_config
SET callback_secret = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE id = 1
  AND coalesce(nullif(trim(callback_secret), ''), '') = '';

CREATE OR REPLACE FUNCTION public.get_mpesa_provider_secrets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private', 'pg_temp'
AS $function$
DECLARE
  cfg private.mpesa_provider_config%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO cfg FROM private.mpesa_provider_config WHERE id = 1;

  IF cfg.id IS NULL THEN
    INSERT INTO private.mpesa_provider_config (id, callback_secret)
    VALUES (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
    RETURNING * INTO cfg;
  ELSIF coalesce(nullif(trim(cfg.callback_secret), ''), '') = '' THEN
    UPDATE private.mpesa_provider_config
    SET callback_secret = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
        updated_at = now()
    WHERE id = 1
    RETURNING * INTO cfg;
  END IF;

  RETURN jsonb_build_object(
    'environment', coalesce(cfg.environment, 'sandbox'),
    'consumer_key', coalesce(cfg.consumer_key, ''),
    'consumer_secret', coalesce(cfg.consumer_secret, ''),
    'shortcode', coalesce(cfg.shortcode, ''),
    'passkey', coalesce(cfg.passkey, ''),
    'party_type', coalesce(cfg.party_type, 'till'),
    'callback_secret', coalesce(cfg.callback_secret, '')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_mpesa_provider_secrets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mpesa_provider_secrets() TO service_role;

-- ---------------------------------------------------------------------------
-- complete_mpesa_stk: idempotent paid + amount must match
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.complete_mpesa_stk(text, text, integer, text, text, jsonb);

CREATE FUNCTION public.complete_mpesa_stk(
  p_checkout_request_id text,
  p_merchant_request_id text,
  p_result_code integer,
  p_result_desc text,
  p_receipt text,
  p_payload jsonb,
  p_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_expected numeric;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF nullif(trim(p_checkout_request_id), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Missing checkout request');
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE checkout_request_id = trim(p_checkout_request_id)
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown checkout request');
  END IF;

  IF lower(coalesce(v_payment.status, '')) IN ('paid', 'completed') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'paid', true,
      'already_paid', true,
      'order_id', v_payment.order_id
    );
  END IF;

  IF p_result_code = 0 THEN
    v_expected := coalesce(v_payment.amount, 0);

    IF p_amount IS NULL OR p_amount <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Missing paid amount');
    END IF;

    IF abs(v_expected - p_amount) > 0.5 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Amount mismatch',
        'expected', v_expected,
        'got', p_amount
      );
    END IF;

    UPDATE public.payments
    SET
      status = 'paid',
      transaction_id = coalesce(nullif(trim(p_receipt), ''), transaction_id),
      merchant_request_id = coalesce(nullif(trim(p_merchant_request_id), ''), merchant_request_id),
      result_desc = coalesce(p_result_desc, 'Paid'),
      mpesa_payload = coalesce(p_payload, mpesa_payload),
      updated_at = now()
    WHERE id = v_payment.id
      AND lower(coalesce(status, '')) NOT IN ('paid', 'completed');

    UPDATE public.orders
    SET
      payment_status = 'paid',
      transaction_id = coalesce(nullif(trim(p_receipt), ''), transaction_id),
      updated_at = now()
    WHERE id = v_payment.order_id
      AND lower(coalesce(payment_status, '')) IS DISTINCT FROM 'paid';

    RETURN jsonb_build_object('ok', true, 'paid', true, 'order_id', v_payment.order_id);
  END IF;

  UPDATE public.payments
  SET
    result_desc = coalesce(p_result_desc, 'Payment not completed'),
    merchant_request_id = coalesce(nullif(trim(p_merchant_request_id), ''), merchant_request_id),
    mpesa_payload = coalesce(p_payload, mpesa_payload),
    updated_at = now()
  WHERE id = v_payment.id
    AND lower(coalesce(status, '')) NOT IN ('paid', 'completed');

  RETURN jsonb_build_object('ok', true, 'paid', false, 'order_id', v_payment.order_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_mpesa_stk(text, text, integer, text, text, jsonb, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_mpesa_stk(text, text, integer, text, text, jsonb, numeric) TO service_role;
