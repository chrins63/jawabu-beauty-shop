import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method === "GET" || req.method === "HEAD") {
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const admin = createClient(supabaseUrl, serviceKey);

    const secrets = await loadCallbackSecret(admin);
    const provided = callbackTokenFrom(req);

    if (!secrets.callbackSecret || !provided || !tokensEqual(provided, secrets.callbackSecret)) {
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Rejected" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const callback = payload?.Body?.stkCallback || payload?.stkCallback || {};
    const metadataItems = callback?.CallbackMetadata?.Item || [];
    const receipt = findMeta(metadataItems, "MpesaReceiptNumber");
    const amount = parseAmount(findMeta(metadataItems, "Amount"));

    await admin.rpc("complete_mpesa_stk", {
      p_checkout_request_id: String(callback.CheckoutRequestID || ""),
      p_merchant_request_id: String(callback.MerchantRequestID || ""),
      p_result_code: Number(callback.ResultCode ?? -1),
      p_result_desc: String(callback.ResultDesc || ""),
      p_receipt: receipt,
      p_payload: payload,
      p_amount: amount,
    });

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Rejected" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function loadCallbackSecret(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc("get_mpesa_provider_secrets");
  if (error) {
    return { callbackSecret: "" };
  }
  return { callbackSecret: String(data?.callback_secret || "").trim() };
}

function callbackTokenFrom(req: Request) {
  const url = new URL(req.url);
  return String(
    url.searchParams.get("token") ||
      req.headers.get("x-sleek-callback-token") ||
      "",
  ).trim();
}

function tokensEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.byteLength !== b.byteLength || a.byteLength === 0) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

function findMeta(items: Array<{ Name?: string; Value?: unknown }>, name: string) {
  const match = (items || []).find((item) => item?.Name === name);
  return match?.Value == null ? "" : String(match.Value);
}

function parseAmount(value: string) {
  const amount = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
