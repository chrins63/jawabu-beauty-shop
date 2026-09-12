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
      return json({ error: "Only staff can send customer emails" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "flush");

    if (action === "test") {
      const testEmail = String(body.email || "").trim().toLowerCase();
      if (!testEmail) {
        return json({ error: "Enter an email address for the test" }, 400);
      }

      const shopUrl = `${await storeUrlFrom(admin, "http://localhost:5174")}/shop`;
      const sent = await sendSleekEmail(admin, {
        to: testEmail,
        subject: "New at Sleek Sisters: a preview",
        payload: {
          name: "Sleek Sisters new arrival",
          price: 0,
          url: shopUrl,
          image_url: "",
          description:
            "This is a sample of the email customers receive when a new product is added.",
        },
      });

      if (!sent.ok) {
        return json({ error: sent.error }, 400);
      }

      return json({ ok: true, sent: 1, queued: 0 });
    }

    const result = await flushOutbox(admin);
    return json({ ok: true, ...result });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Email dispatch failed",
    }, 500);
  }
});

async function flushOutbox(admin: ReturnType<typeof createClient>) {
  const { data: queued, error } = await admin
    .from("email_outbox")
    .select("id, email, subject, payload")
    .eq("status", "queued")
    .order("id", { ascending: true })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  const rows = queued || [];
  if (rows.length === 0) {
    return { sent: 0, failed: 0, queued: 0 };
  }

  const config = await loadMailConfig(admin);
  if (!config.ok) {
    return {
      sent: 0,
      failed: 0,
      queued: rows.length,
      warning: config.error,
    };
  }

  let sent = 0;
  let failed = 0;
  const client = makeSmtpClient(config);

  try {
    for (const row of rows) {
      const result = await sendWithClient(client, config, {
        to: row.email,
        subject: row.subject,
        payload: row.payload || {},
      });

      if (result.ok) {
        sent += 1;
        await admin
          .from("email_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_response: "sent",
          })
          .eq("id", row.id);
      } else {
        failed += 1;
        await admin
          .from("email_outbox")
          .update({
            status: "failed",
            provider_response: result.error,
          })
          .eq("id", row.id);
      }
    }
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }

  return { sent, failed, queued: rows.length };
}

async function sendSleekEmail(
  admin: ReturnType<typeof createClient>,
  options: { to: string; subject: string; payload: Record<string, unknown> },
) {
  const config = await loadMailConfig(admin);
  if (!config.ok) {
    return config;
  }

  const client = makeSmtpClient(config);
  try {
    return await sendWithClient(client, config, options);
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

function makeSmtpClient(config: MailConfig) {
  return new SMTPClient({
    connection: {
      hostname: config.smtp_host,
      port: config.smtp_port || 465,
      tls: true,
      auth: {
        username: config.username,
        password: config.password,
      },
    },
  });
}

async function sendWithClient(
  client: SMTPClient,
  config: MailConfig,
  options: { to: string; subject: string; payload: Record<string, unknown> },
) {
  try {
    await client.send({
      from: `${config.from_name || "Sleek Sisters"} <${config.from_email}>`,
      to: options.to,
      subject: options.subject,
      content: productText(options.payload),
      html: productHtml(options.payload),
    });
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error
        ? error.message
        : "Could not send email from the Sleek Sisters account.",
    };
  }
}

type MailConfig = {
  ok: true;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  username: string;
  password: string;
};

async function loadMailConfig(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc("get_email_provider_secrets");

  if (error) {
    return {
      ok: false as const,
      error: error.message || "Could not load the Sleek Sisters mailbox.",
    };
  }

  const config = data && typeof data === "object" ? data : {};
  const from_email = String(config.from_email || config.username || "").trim();
  const username = String(config.username || "").trim();
  const password = String(config.password || "").replace(/\s+/g, "");
  const smtp_host = String(config.smtp_host || "").trim();

  if (!smtp_host || !username || !password || !from_email) {
    return {
      ok: false as const,
      error:
        "Save the Sleek Sisters mailbox in Admin → Email before sending product emails.",
    };
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

async function storeUrlFrom(
  admin: ReturnType<typeof createClient>,
  fallback: string,
) {
  const { data } = await admin
    .from("settings")
    .select("setting_value")
    .eq("category", "sms")
    .eq("setting_key", "store_public_url")
    .maybeSingle();

  const raw = data?.setting_value;
  const value = typeof raw === "string"
    ? raw.replace(/^"|"$/g, "").trim()
    : String(raw ?? "").trim();
  return (value || fallback).replace(/\/$/, "");
}

function productText(payload: Record<string, unknown>) {
  const name = String(payload.name || "a new product");
  const url = String(payload.url || "http://localhost:5174/shop");
  const description = String(payload.description || "").trim();
  const price = formatKes(payload.price);
  return [
    "New at Sleek Sisters",
    name,
    price ? `Price: ${price}` : "",
    description,
    `See it here: ${url}`,
    "",
    "Grace in Every Detail",
    "Sleek Sisters",
  ].filter(Boolean).join("\n");
}

function productHtml(payload: Record<string, unknown>) {
  const name = escapeHtml(String(payload.name || "a new product"));
  const url = escapeHtml(String(payload.url || "http://localhost:5174/shop"));
  const description = escapeHtml(String(payload.description || "").trim());
  const image = String(payload.image_url || "");
  const safeImage = /^https?:\/\//i.test(image) ? escapeHtml(image) : "";
  const price = formatKes(payload.price);

  return `<div style="font-family:Georgia,serif;background:#fafaf8;padding:28px;color:#262220;">
  <div style="max-width:520px;margin:0 auto;background:#111;color:#f5ead0;padding:28px;border:1px solid #c9a876;">
    <p style="color:#c9a876;letter-spacing:0.12em;text-transform:uppercase;font-size:12px;margin:0 0 8px;">Sleek Sisters</p>
    <h1 style="font-size:26px;margin:0 0 16px;">New in the shop</h1>
    <p style="line-height:1.6;">A new piece just landed. Have a look while it is still in stock.</p>
    ${safeImage ? `<img src="${safeImage}" alt="${name}" style="width:100%;max-height:280px;object-fit:cover;margin:12px 0;border:1px solid #c9a876;" />` : ""}
    <h2 style="font-size:22px;margin:16px 0 8px;color:#f5ead0;">${name}</h2>
    ${price ? `<p style="color:#c9a876;margin:0 0 12px;">${escapeHtml(price)}</p>` : ""}
    ${description ? `<p style="line-height:1.6;">${description}</p>` : ""}
    <p><a href="${url}" style="color:#c9a876;">View this product</a></p>
    <p style="color:#e8d5a3;font-style:italic;">Grace in Every Detail</p>
  </div>
</div>`;
}

function formatKes(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }
  return `KSh ${amount.toLocaleString("en-KE")}`;
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
