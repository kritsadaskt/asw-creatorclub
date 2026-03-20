/// <reference lib="deno.ns" />

/**
 * Microsoft 365 SMTP:
 * - Port 587 = STARTTLS (plain socket, then upgrade). The deno `smtp` lib used here does NOT implement STARTTLS.
 * - Port 465 = implicit TLS → use `connectTLS` (works with this client).
 *
 * Set secrets on the project (local .env is NOT available to deployed functions):
 *   supabase secrets set SMTP_HOST=smtp.office365.com SMTP_PORT=465 SMTP_USERNAME=... SMTP_PASSWORD=... SMTP_FROM_ADDRESS=...
 *
 * Or: Dashboard → Project Settings → Edge Functions → Secrets
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return jsonResponse({ error: "INVALID_INPUT" }, 400);
    }

    const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.office365.com";
    // 465 = implicit TLS (required for this client). Do not use 587 unless you switch to a STARTTLS-capable mailer.
    const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "465");
    const smtpUser = Deno.env.get("SMTP_USERNAME");
    const smtpPass = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom = Deno.env.get("SMTP_FROM_ADDRESS");

    if (!smtpUser || !smtpPass || !smtpFrom) {
      console.error(
        "send-password-otp: missing SMTP_USERNAME, SMTP_PASSWORD, or SMTP_FROM_ADDRESS in Edge Function secrets",
      );
      return jsonResponse(
        {
          error: "SMTP_NOT_CONFIGURED",
          hint:
            "Set SMTP_* secrets in Supabase (Dashboard → Edge Functions → Secrets, or `supabase secrets set ...`). Local .env is not used when the function runs in the cloud.",
        },
        500,
      );
    }

    if (smtpPort === 587) {
      console.warn(
        "SMTP_PORT=587 uses STARTTLS; this function expects implicit TLS on 465. Set SMTP_PORT=465 for Microsoft 365.",
      );
    }

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
    });

    await client.send({
      from: smtpFrom,
      to: email,
      subject: "Creator Club - รหัสยืนยันกู้คืนรหัสผ่าน",
      content: `รหัสยืนยันของคุณคือ: ${otp}\nรหัสนี้จะหมดอายุภายใน 10 นาที`,
    });

    await client.close();

    return jsonResponse({ success: true });
  } catch (e) {
    const msg = errMessage(e);
    console.error("send-password-otp error:", msg, e);
    return jsonResponse(
      {
        error: "SMTP_SEND_FAILED",
        // Safe to return: helps debug TLS/auth without exposing secrets
        details: msg,
      },
      500,
    );
  }
});
