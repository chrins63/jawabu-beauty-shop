import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Not signed in" }, 401);
    }

    const { data: caller } = await admin
      .from("staff_profiles")
      .select("role, active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!caller || caller.active !== true) {
      return json({ error: "Only staff can send SMS" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "flush");

    if (action === "test") {
      const phone = String(body.phone || "");
      const { data: subscribed, error: subError } = await admin.rpc(
        "subscribe_to_sms",
        {
          p_phone: phone,
          p_name: "Staff test",
          p_source: "test",
        }
      );

      if (subError || subscribed?.ok === false) {
        return json({
          error: subscribed?.error || subError?.message || "Invalid phone",
        }, 400);
      }

      const { error: insertError } = await admin.from("sms_outbox").insert({
        phone: subscribed.phone,
        message:
          "Sleek Sisters test SMS. If you received this, bulk SMS is working. Stay sleek.",
        kind: "test",
        status: "queued",
      });

      if (insertError) {
        return json({ error: insertError.message }, 400);
      }
    }

    const result = await flushOutbox(admin);
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ error: error?.message || "SMS dispatch failed" }, 500);
  }
});

async function flushOutbox(admin: ReturnType<typeof createClient>) {
  const { data: secrets } = await admin.rpc("get_sms_provider_secrets");
  const username = String(secrets?.username || "").trim();
  const apiKey = String(secrets?.api_key || "").trim();
  const senderId = String(secrets?.sender_id || "").trim();

  const { data: queued, error } = await admin
    .from("sms_outbox")
    .select("id, phone, message, kind")
    .eq("status", "queued")
    .order("id", { ascending: true })
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  const rows = queued || [];

  if (rows.length === 0) {
    return { sent: 0, failed: 0, skipped: 0, queued: 0 };
  }

  if (!username || !apiKey) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      queued: rows.length,
      warning:
        "SMS queued but not sent. Save Africa's Talking details in Admin → SMS.",
    };
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const result = await sendAfricasTalking({
      username,
      apiKey,
      senderId,
      to: row.phone,
      message: row.message,
    });

    if (result.ok) {
      sent += 1;
      await admin
        .from("sms_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_response: result.detail,
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      await admin
        .from("sms_outbox")
        .update({
          status: "failed",
          provider_response: result.detail,
        })
        .eq("id", row.id);
    }
  }

  return { sent, failed, skipped: 0, queued: rows.length };
}

async function sendAfricasTalking(params: {
  username: string;
  apiKey: string;
  senderId: string;
  to: string;
  message: string;
}) {
  const endpoint = params.username.toLowerCase() === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const body = new URLSearchParams({
    username: params.username,
    to: params.to,
    message: params.message,
  });

  if (params.senderId) {
    body.set("from", params.senderId);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apiKey: params.apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    return { ok: false, detail: text.slice(0, 500) };
  }

  return { ok: true, detail: text.slice(0, 500) };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
