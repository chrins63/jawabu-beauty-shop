import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const orderId = Number(body.order_id);
    const phone = String(body.phone || "");

    if (!orderId || !phoneKey(phone)) {
      return json({ ok: false, error: "Missing order" }, 400);
    }

    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id, order_number, first_name, last_name, email, phone, total_amount, payment_method, delivery_option_id, city",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order || phoneKey(order.phone) !== phoneKey(phone)) {
      return json({ ok: false, error: "We could not match that order." }, 404);
    }

    let deliveryName = order.city || "Nairobi";
    if (order.delivery_option_id) {
      const { data: option } = await admin
        .from("delivery_options")
        .select("name")
        .eq("id", order.delivery_option_id)
        .maybeSingle();
      if (option?.name) {
        deliveryName = option.name;
      }
    }

    const summary = {
      orderNumber: order.order_number || `SS-${order.id}`,
      name: [order.first_name, order.last_name].filter(Boolean).join(" ").trim() ||
        "there",
      total: formatKes(order.total_amount),
      deliveryName,
      paymentMethod: order.payment_method || "M-Pesa",
    };

    const emailSent = order.email
      ? await sendConfirmationEmail(admin, order.id, order.email, summary)
      : false;
    const smsSent = await sendConfirmationSms(admin, order.id, order.phone, summary);

    return json({ ok: true, email_sent: emailSent, sms_sent: smsSent });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Confirmation failed",
    }, 500);
  }
});

async function sendConfirmationEmail(
  admin: ReturnType<typeof createClient>,
  orderId: number,
  email: string,
  summary: OrderSummary,
) {
  const { data: existing } = await admin
    .from("email_outbox")
    .select("id, status")
    .eq("kind", "order_confirmation")
    .eq("related_order_id", orderId)
    .maybeSingle();

  if (existing?.status === "sent") {
    return true;
  }

  let rowId = existing?.id;
  if (!rowId) {
    const { data: inserted, error } = await admin
      .from("email_outbox")
      .insert({
        email,
        kind: "order_confirmation",
        status: "queued",
        related_order_id: orderId,
        subject: `Sleek Sisters order ${summary.orderNumber}`,
        payload: summary,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return false;
    }
    rowId = inserted.id;
  }

  const config = await loadMailConfig(admin);
  if (!config.ok) {
    await admin.from("email_outbox").update({
      provider_response: config.error,
    }).eq("id", rowId);
    return false;
  }

  const client = new SMTPClient({
    connection: {
      hostname: config.smtp_host,
      port: config.smtp_port,
      tls: true,
      auth: {
        username: config.username,
        password: config.password,
      },
    },
  });

  try {
    await client.send({
      from: `${config.from_name} <${config.from_email}>`,
      to: email,
      subject: `Sleek Sisters order ${summary.orderNumber}`,
      content: confirmationText(summary),
      html: confirmationHtml(summary),
    });
    await admin.from("email_outbox").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_response: "sent",
    }).eq("id", rowId);
    return true;
  } catch (error) {
    await admin.from("email_outbox").update({
      status: "failed",
      provider_response: error instanceof Error ? error.message : "send failed",
    }).eq("id", rowId);
    return false;
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

async function sendConfirmationSms(
  admin: ReturnType<typeof createClient>,
  orderId: number,
  phone: string,
  summary: OrderSummary,
) {
  const message = confirmationSms(summary);
  const { data: existing } = await admin
    .from("sms_outbox")
    .select("id, status")
    .eq("kind", "order_confirmation")
    .eq("related_order_id", orderId)
    .maybeSingle();

  if (existing?.status === "sent") {
    return true;
  }

  let rowId = existing?.id;
  if (!rowId) {
    const { data: inserted, error } = await admin
      .from("sms_outbox")
      .insert({
        phone,
        message,
        kind: "order_confirmation",
        status: "queued",
        related_order_id: orderId,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return false;
    }
    rowId = inserted.id;
  }

  const { data: secrets } = await admin.rpc("get_sms_provider_secrets");
  const username = String(secrets?.username || "").trim();
  const apiKey = String(secrets?.api_key || "").trim();
  const senderId = String(secrets?.sender_id || "").trim();

  if (!username || !apiKey) {
    await admin.from("sms_outbox").update({
      provider_response: "SMS provider is not configured",
    }).eq("id", rowId);
    return false;
  }

  const endpoint = username.toLowerCase() === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";
  const form = new URLSearchParams({
    username,
    to: toMsisdn(phone),
    message,
  });
  if (senderId) {
    form.set("from", senderId);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const detail = await response.text();
  const ok = response.ok && !/InvalidPhoneNumber|Failed/i.test(detail);

  await admin.from("sms_outbox").update({
    status: ok ? "sent" : "failed",
    sent_at: ok ? new Date().toISOString() : null,
    provider_response: detail.slice(0, 500),
  }).eq("id", rowId);

  return ok;
}

type OrderSummary = {
  orderNumber: string;
  name: string;
  total: string;
  deliveryName: string;
  paymentMethod: string;
};

function confirmationText(summary: OrderSummary) {
  return [
    `Hello ${summary.name},`,
    `We received your Sleek Sisters order ${summary.orderNumber}.`,
    `Total: ${summary.total}`,
    `Receive it: ${summary.deliveryName}`,
    `Payment: ${summary.paymentMethod}. ${paymentNote(summary.paymentMethod)}`,
    "Track it with your order number and the phone you used at checkout.",
    "",
    "Grace in Every Detail",
    "Sleek Sisters",
  ].join("\n");
}

function confirmationHtml(summary: OrderSummary) {
  return `<div style="font-family:Georgia,serif;background:#fafaf8;padding:28px;color:#262220;">
  <div style="max-width:520px;margin:0 auto;background:#111;color:#f5ead0;padding:28px;border:1px solid #c9a876;">
    <p style="color:#c9a876;letter-spacing:0.12em;text-transform:uppercase;font-size:12px;margin:0 0 8px;">Sleek Sisters</p>
    <h1 style="font-size:26px;margin:0 0 16px;">Order received</h1>
    <p>Hello ${escapeHtml(summary.name)}, we have your order <strong>${escapeHtml(summary.orderNumber)}</strong>.</p>
    <p>Total: ${escapeHtml(summary.total)}</p>
    <p>Receive it: ${escapeHtml(summary.deliveryName)}</p>
    <p>Payment: ${escapeHtml(summary.paymentMethod)}. ${escapeHtml(paymentNote(summary.paymentMethod))}</p>
    <p>Track it with your order number and the phone you used at checkout.</p>
    <p style="color:#e8d5a3;font-style:italic;">Grace in Every Detail</p>
  </div>
</div>`;
}

function confirmationSms(summary: OrderSummary) {
  return `Sleek Sisters: order ${summary.orderNumber} received. Total ${summary.total}. ${summary.deliveryName}. Payment: ${summary.paymentMethod}.`;
}

function paymentNote(method: string) {
  if (method === "Cash") return "Pay cash when you receive the order.";
  if (method === "Card") return "We will contact you to take the card payment.";
  if (method === "Bank transfer") return "We will send bank details to confirm payment.";
  return "Complete M-Pesa to confirm the order.";
}

async function loadMailConfig(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc("get_email_provider_secrets");
  if (error) {
    return { ok: false as const, error: error.message || "Mailbox is not ready." };
  }
  const config = data && typeof data === "object" ? data : {};
  const from_email = String(config.from_email || config.username || "").trim();
  const username = String(config.username || "").trim();
  const password = String(config.password || "").replace(/\s+/g, "");
  const smtp_host = String(config.smtp_host || "").trim();
  if (!smtp_host || !username || !password || !from_email) {
    return { ok: false as const, error: "Mailbox is not configured." };
  }
  return {
    ok: true as const,
    from_name: String(config.from_name || "Sleek Sisters"),
    from_email,
    smtp_host,
    smtp_port: Number(config.smtp_port || 465),
    username,
    password,
  };
}

function phoneKey(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 9) return "";
  return digits.slice(-9);
}

function toMsisdn(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.startsWith("254")) return `+${digits}`;
  return value;
}

function formatKes(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "KSh 0";
  return `KSh ${Math.round(amount).toLocaleString("en-KE")}`;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
