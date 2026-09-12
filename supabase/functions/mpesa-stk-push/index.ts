import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true }, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "push");

    if (action === "test") {
      return await testDarajaConnection(req, admin, supabaseUrl, anonKey);
    }

    const orderId = Number(body.order_id);
    const contactPhone = String(body.contact_phone || "");
    const mpesaPhone = String(body.mpesa_phone || body.contact_phone || "");

    if (!orderId) {
      return json({ ok: false, error: "Missing order" }, 400);
    }

    const secrets = await loadMpesaSecrets(admin);
    if (!secrets.ok) {
      return json({
        ok: false,
        stk_ready: false,
        error: secrets.error,
      }, secrets.status);
    }

    const { data: prepared, error: prepareError } = await admin.rpc(
      "prepare_mpesa_stk",
      {
        p_order_id: orderId,
        p_contact_phone: contactPhone,
        p_mpesa_phone: mpesaPhone,
      },
    );

    if (prepareError) {
      return json({ ok: false, error: prepareError.message }, 400);
    }

    if (prepared?.ok === false) {
      return json({ ok: false, error: prepared.error }, 400);
    }

    if (prepared?.already_paid) {
      return json({
        ok: true,
        already_paid: true,
        order_number: prepared.order_number,
      });
    }

    const token = await darajaToken(
      secrets.host,
      secrets.consumerKey,
      secrets.consumerSecret,
    );
    if (!token) {
      return json({
        ok: false,
        error: "Could not connect to Safaricom. Try Lipa Na M-Pesa below.",
      }, 502);
    }

    const timestamp = darajaTimestamp();
    const password = btoa(`${secrets.shortcode}${secrets.passkey}${timestamp}`);
    const callbackUrl = secrets.callbackSecret
      ? `${supabaseUrl}/functions/v1/mpesa-stk-callback?token=${encodeURIComponent(secrets.callbackSecret)}`
      : "";

    if (!callbackUrl) {
      return json({
        ok: false,
        error: "M-Pesa callback is not ready. Save M-Pesa settings and try again.",
      }, 409);
    }
    const transactionType = secrets.partyType === "paybill"
      ? "CustomerPayBillOnline"
      : "CustomerBuyGoodsOnline";

    const stkBody = {
      BusinessShortCode: secrets.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Number(prepared.amount),
      PartyA: prepared.msisdn,
      PartyB: secrets.shortcode,
      PhoneNumber: prepared.msisdn,
      CallBackURL: callbackUrl,
      AccountReference: prepared.account_reference || "SLEEKSISTERS",
      TransactionDesc: `Sleek Sisters ${prepared.order_number}`,
    };

    const stkResponse = await fetch(`${secrets.host}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkBody),
    });

    const stkJson = await stkResponse.json().catch(() => ({}));

    if (
      !stkResponse.ok ||
      String(stkJson.ResponseCode || "") !== "0"
    ) {
      return json({
        ok: false,
        error:
          stkJson.errorMessage ||
          stkJson.CustomerMessage ||
          stkJson.ResponseDescription ||
          "Safaricom did not send the prompt. Use Lipa Na M-Pesa below.",
      }, 400);
    }

    await admin.rpc("save_mpesa_stk_request", {
      p_order_id: orderId,
      p_checkout_request_id: stkJson.CheckoutRequestID || "",
      p_merchant_request_id: stkJson.MerchantRequestID || "",
    });

    return json({
      ok: true,
      already_paid: false,
      order_number: prepared.order_number,
      customer_message:
        stkJson.CustomerMessage ||
        "Check your phone and enter your M-Pesa PIN to complete payment.",
    });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not start M-Pesa payment",
    }, 500);
  }
});

async function testDarajaConnection(
  req: Request,
  admin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  anonKey: string,
) {
  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ ok: false, error: "Not signed in" }, 401);
  }

  const { data: caller } = await admin
    .from("staff_profiles")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!caller || caller.active !== true) {
    return json({ ok: false, error: "Only staff can test M-Pesa" }, 403);
  }

  const secrets = await loadMpesaSecrets(admin);
  if (!secrets.ok) {
    return json({
      ok: false,
      stk_ready: false,
      error: secrets.status === 409
        ? "Save the till or shortcode, consumer key, secret, and passkey first."
        : secrets.error,
    }, secrets.status);
  }

  const token = await darajaToken(
    secrets.host,
    secrets.consumerKey,
    secrets.consumerSecret,
  );

  if (!token) {
    return json({
      ok: false,
      error:
        "Safaricom rejected these keys. Check the consumer key, secret, and sandbox vs production.",
    }, 502);
  }

  return json({
    ok: true,
    environment: secrets.environment,
    party_type: secrets.partyType,
  });
}

async function loadMpesaSecrets(admin: ReturnType<typeof createClient>) {
  const { data: secrets, error: secretError } = await admin.rpc(
    "get_mpesa_provider_secrets",
  );

  if (secretError) {
    return { ok: false as const, error: secretError.message, status: 400 };
  }

  const consumerKey = String(secrets?.consumer_key || "").trim();
  const consumerSecret = String(secrets?.consumer_secret || "").trim();
  const shortcode = String(secrets?.shortcode || "").trim();
  const passkey = String(secrets?.passkey || "").trim();
  const callbackSecret = String(secrets?.callback_secret || "").trim();
  const environment = String(secrets?.environment || "sandbox");
  const partyType = String(secrets?.party_type || "till");

  if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
    return {
      ok: false as const,
      status: 409,
      error:
        "M-Pesa STK is not connected yet. Use Lipa Na M-Pesa with your order number.",
    };
  }

  return {
    ok: true as const,
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackSecret,
    environment,
    partyType,
    host: environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke",
  };
}

async function darajaToken(
  host: string,
  key: string,
  secret: string,
): Promise<string | null> {
  const basic = btoa(`${key}:${secret}`);
  const response = await fetch(
    `${host}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${basic}` } },
  );

  const payload = await response.json().catch(() => ({}));
  return payload.access_token || null;
}

function darajaTimestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value || "00";
  return `${pick("year")}${pick("month")}${pick("day")}${pick("hour")}${pick("minute")}${pick("second")}`;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
