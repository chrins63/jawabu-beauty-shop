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
    const admin = createClient(supabaseUrl, serviceKey);
    const anon = createClient(supabaseUrl, anonKey);

    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier || "").trim();
    const pin = String(body.pin || body.password || "").trim();

    if (!identifier || !pin) {
      return json({ error: "Enter your email or phone number and PIN" }, 400);
    }

    const email = identifier.includes("@")
      ? identifier.toLowerCase()
      : await emailForPhone(admin, identifier);

    if (!email) {
      return json({ error: "Invalid login details" }, 401);
    }

    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password: pin,
    });

    if (error || !data?.session || !data.user) {
      return json({ error: "Invalid login details" }, 401);
    }

    const { data: profile } = await admin
      .from("staff_profiles")
      .select("active, role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!profile || profile.active !== true) {
      return json({ error: "This staff account is not active" }, 403);
    }

    return json({
      ok: true,
      session: data.session,
      user: data.user,
    });
  } catch (error) {
    return json({ error: error?.message || "Login failed" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function phoneLookupValues(value: string) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^0-9]/g, "");
  const values = new Set([raw, digits]);

  if (digits.startsWith("254") && digits.length >= 12) {
    values.add(`+${digits.slice(0, 12)}`);
    values.add(`0${digits.slice(3, 12)}`);
  } else if (digits.startsWith("0") && digits.length === 10) {
    values.add(`+254${digits.slice(1)}`);
    values.add(`254${digits.slice(1)}`);
  } else if (digits.length === 9) {
    values.add(`+254${digits}`);
    values.add(`0${digits}`);
  }

  return [...values].filter(Boolean);
}

async function emailForPhone(admin: ReturnType<typeof createClient>, phone: string) {
  const lookups = phoneLookupValues(phone);

  const { data: rows } = await admin
    .from("staff_profiles")
    .select("user_id, phone, active")
    .in("phone", lookups)
    .eq("active", true)
    .limit(1);

  const profile = rows?.[0];

  if (!profile?.user_id) {
    return "";
  }

  const { data } = await admin.auth.admin.getUserById(profile.user_id);
  return String(data?.user?.email || "").toLowerCase();
}
