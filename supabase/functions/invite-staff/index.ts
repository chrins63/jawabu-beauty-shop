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
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

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

    if (!caller || caller.active !== true || !["owner", "admin"].includes(caller.role)) {
      return json({ error: "Only the owner can manage staff" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "invite");

    if (action === "test") {
      const testEmail = String(body.email || "").trim().toLowerCase();
      if (!testEmail) {
        return json({ error: "Enter an email address for the test" }, 400);
      }

      const sent = await sendStaffEmail(admin, {
        to: testEmail,
        name: "Team",
        pin: "000000",
        loginUrl: loginUrlFrom(req, await loadMailConfig(admin)),
        test: true,
      });

      if (!sent.ok) {
        return json({ error: sent.error }, 400);
      }

      return json({ ok: true, emailed: true });
    }

    if (action === "remove") {
      const targetUserId = String(body.user_id || "").trim();
      if (!targetUserId) {
        return json({ error: "Missing staff account" }, 400);
      }

      if (targetUserId === user.id) {
        return json({ error: "You cannot remove your own account" }, 400);
      }

      const { data: target } = await admin
        .from("staff_profiles")
        .select("user_id, role, first_name, last_name")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!target) {
        return json({ error: "That staff account was not found" }, 404);
      }

      if (target.role === "owner") {
        return json({ error: "The owner account cannot be removed" }, 403);
      }

      if (!["staff", "manager"].includes(String(target.role))) {
        return json({ error: "Only staff or managers can be removed" }, 403);
      }

      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(
        targetUserId,
      );

      if (deleteAuthError) {
        const { error: profileDeleteError } = await admin
          .from("staff_profiles")
          .delete()
          .eq("user_id", targetUserId);

        if (profileDeleteError) {
          return json({
            error: profileDeleteError.message || deleteAuthError.message,
          }, 400);
        }

        await admin.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h",
        });
      }

      return json({
        ok: true,
        removed: true,
        name: `${target.first_name} ${target.last_name}`.trim(),
      });
    }

    const emailInput = String(body.email || "").trim().toLowerCase();
    const targetUserId = String(body.user_id || "").trim();
    const firstName = String(body.first_name || "").trim();
    const lastName = String(body.last_name || "").trim();
    const role = String(body.role || "staff").trim();
    const phone = String(body.phone || "").trim();
    const secret = String(body.pin || body.password || "").trim();
    const secretIsPin = isPinSecret(secret);
    const e164 = normalizeKenyanPhone(phone);

    let email = emailInput;

    if (!email && targetUserId) {
      const { data: existingUser } = await admin.auth.admin.getUserById(targetUserId);
      email = String(existingUser?.user?.email || "").toLowerCase();
    }

    if (!email || !firstName || !lastName) {
      return json({ error: "Email, first name and last name are required" }, 400);
    }

    if (!["owner", "manager", "staff"].includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    if (!isValidStaffSecret(secret)) {
      return json({
        error: "Use a 6 to 8 digit PIN, or a password of at least 8 characters",
      }, 400);
    }

    let userId = "";

    const created = await admin.auth.admin.createUser({
      email,
      password: secret,
      email_confirm: true,
      phone: e164 || undefined,
      phone_confirm: Boolean(e164),
      user_metadata: { full_name: `${firstName} ${lastName}` },
      app_metadata: { role, provider: "sleek-sisters" },
    });

    if (created.error || !created.data?.user) {
      const existing = await findUserByEmail(admin, email);

      if (!existing) {
        const retry = await admin.auth.admin.createUser({
          email,
          password: secret,
          email_confirm: true,
          user_metadata: { full_name: `${firstName} ${lastName}` },
          app_metadata: { role, provider: "sleek-sisters" },
        });

        if (retry.error || !retry.data?.user) {
          return json({
            error: created.error?.message || retry.error?.message || "Could not create that account",
          }, 400);
        }

        userId = retry.data.user.id;
      } else {
        userId = existing.id;
        const updated = await admin.auth.admin.updateUserById(userId, {
          password: secret,
          email_confirm: true,
          phone: e164 || undefined,
          phone_confirm: Boolean(e164),
        });

        if (updated.error) {
          await admin.auth.admin.updateUserById(userId, {
            password: secret,
            email_confirm: true,
          });
        }
      }
    } else {
      userId = created.data.user.id;
    }

    const { error: profileError } = await admin.from("staff_profiles").upsert(
      {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        phone: phone || e164 || null,
        role,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      return json({ error: profileError.message }, 400);
    }

    const mailConfig = await loadMailConfig(admin);
    const sent = await sendStaffEmail(admin, {
      to: email,
      name: firstName,
      pin: secret,
      secretIsPin,
      loginUrl: loginUrlFrom(req, mailConfig),
      test: false,
      config: mailConfig,
    });

    return json({
      ok: true,
      user_id: userId,
      emailed: sent.ok,
      warning: sent.ok ? null : sent.error,
    });
  } catch (error) {
    return json({ error: error?.message || "Invite failed" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPinSecret(value: string) {
  return /^\d{6,8}$/.test(value);
}

function isValidStaffSecret(value: string) {
  return isPinSecret(value) || value.length >= 8;
}

function normalizeKenyanPhone(value: string) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("254") && digits.length >= 12) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith("0") && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    return `+254${digits}`;
  }
  return "";
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return (data?.users || []).find((item) => String(item.email || "").toLowerCase() === email) || null;
}

async function loadMailConfig(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc("get_email_provider_secrets");

  if (error) {
    throw new Error(error.message || "Could not load the Sleek Sisters mailbox.");
  }

  const config = data && typeof data === "object" ? data : {};

  return {
    from_name: String(config.from_name || "Sleek Sisters"),
    from_email: String(config.from_email || ""),
    smtp_host: String(config.smtp_host || ""),
    smtp_port: Number(config.smtp_port || 465),
    username: String(config.username || ""),
    password: String(config.password || "").replace(/\s+/g, ""),
    admin_login_url: String(config.admin_login_url || ""),
  };
}

function loginUrlFrom(req: Request, config: { admin_login_url?: string }) {
  const saved = String(config.admin_login_url || "").replace(/\/$/, "");
  if (saved) {
    return saved.endsWith("/login") ? saved : `${saved}/login`;
  }

  const origin = req.headers.get("origin") || "http://localhost:5176";
  return `${origin.replace(/\/$/, "")}/login`;
}

async function sendStaffEmail(
  admin: ReturnType<typeof createClient>,
  options: {
    to: string;
    name: string;
    pin: string;
    secretIsPin?: boolean;
    loginUrl: string;
    test?: boolean;
    config?: Awaited<ReturnType<typeof loadMailConfig>>;
  },
) {
  const config = options.config || await loadMailConfig(admin);
  const host = config.smtp_host;
  const username = config.username;
  const password = config.password;
  const fromEmail = config.from_email || username;

  if (!host || !username || !password || !fromEmail) {
    return {
      ok: false,
      error: "Save the Sleek Sisters email account in Admin → Email before sending PIN emails.",
    };
  }

  const from = `${config.from_name || "Sleek Sisters"} <${fromEmail}>`;
  const secretIsPin = options.secretIsPin !== false && isPinSecret(options.pin);
  const secretLabel = secretIsPin ? "PIN" : "password";
  const subject = options.test
    ? "Sleek Sisters email test"
    : `Your Sleek Sisters staff login ${secretLabel}`;
  const html = options.test
    ? "This is a test from Sleek Sisters. Staff PIN emails will come from this address, not from Supabase."
    : staffPinHtml(options.name, options.pin, options.loginUrl, secretIsPin);
  const text = options.test
    ? "This is a test from Sleek Sisters."
    : `Hi ${options.name},\n\nYour Sleek Sisters admin login ${secretLabel} is ${options.pin}.\n\nSign in at ${options.loginUrl} with your email or phone number and this ${secretLabel}.\n\nGrace in Every Detail\nSleek Sisters`;

  try {
    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: config.smtp_port || 465,
        tls: true,
        auth: {
          username,
          password,
        },
      },
    });

    await client.send({
      from,
      to: options.to,
      subject,
      content: text,
      html,
    });
    await client.close();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Could not send email from the Sleek Sisters account.",
    };
  }
}

function staffPinHtml(name: string, pin: string, loginUrl: string, secretIsPin = true) {
  const wrap = (tag: string, style: string, inner: string) =>
    `<${tag} style="${style}">${inner}</${tag}>`;
  const label = secretIsPin ? "PIN" : "password";

  return wrap(
    "div",
    "font-family:Georgia,serif;background:#fafaf8;padding:28px;color:#262220;",
    wrap(
      "div",
      "max-width:520px;margin:0 auto;background:#111;color:#f5ead0;padding:28px;border:1px solid #c9a876;",
      wrap("p", "color:#c9a876;letter-spacing:0.12em;text-transform:uppercase;font-size:12px;margin:0 0 8px;", "Sleek Sisters")
        + wrap("h1", "font-size:26px;margin:0 0 16px;", `Your staff login ${label}`)
        + wrap("p", "line-height:1.6;", `Hi ${escapeHtml(name)}, welcome to the Sleek Sisters admin. Use this ${label} to sign in with your email or phone number.`)
        + wrap("p", secretIsPin
          ? "font-size:32px;letter-spacing:0.2em;color:#c9a876;margin:24px 0;"
          : "font-size:22px;color:#c9a876;margin:24px 0;word-break:break-all;", escapeHtml(pin))
        + wrap("p", "", `<a href="${escapeHtml(loginUrl)}" style="color:#c9a876;">Open admin login</a>`)
        + wrap("p", "color:#e8d5a3;font-style:italic;", "Grace in Every Detail"),
    ),
  );
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
