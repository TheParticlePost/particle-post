import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getSupabaseClient } from "@/lib/supabase";

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || "fallback-secret";

/**
 * Generate an HMAC unsubscribe token for an email address.
 * Used by both the unsubscribe endpoint and email template generation.
 *
 * Algorithm: HMAC-SHA256(secret, email) → hex digest.
 * Must match: pipeline/utils/email_sender.py _build_unsubscribe_url()
 */
export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", UNSUBSCRIBE_SECRET).update(email).digest("hex");
}

/**
 * Build a full unsubscribe URL for a subscriber.
 */
export function buildUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  const encodedEmail = encodeURIComponent(email);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";
  return `${baseUrl}/api/unsubscribe?email=${encodedEmail}&token=${token}`;
}

/**
 * GET /api/unsubscribe?email=X&token=Y
 * One-click unsubscribe (CAN-SPAM compliant).
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");

  if (!email || !token) {
    return htmlResponse("Missing parameters", "Invalid unsubscribe link.", 400);
  }

  // Verify HMAC token
  const expectedToken = generateUnsubscribeToken(email);
  if (token !== expectedToken) {
    return htmlResponse("Invalid link", "This unsubscribe link is invalid or has expired.", 403);
  }

  // Update subscriber status
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      console.error("Unsubscribe error:", error);
      return htmlResponse("Error", "Something went wrong. Please try again.", 500);
    }

    return htmlResponse(
      "Unsubscribed",
      `You have been unsubscribed from Particle Post briefings. ` +
      `<a href="/subscribe/" style="color:#E8552E">Re-subscribe</a>`,
      200,
    );
  } catch {
    return htmlResponse("Error", "Something went wrong. Please try again.", 500);
  }
}

function htmlResponse(title: string, message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - Particle Post</title></head>
<body style="margin:0;padding:60px 20px;background:#141414;color:#F5F0EB;font-family:'DM Sans',Helvetica,Arial,sans-serif;text-align:center">
  <h1 style="font-size:24px;margin-bottom:16px">${title}</h1>
  <p style="font-size:16px;color:#9A8C82;max-width:400px;margin:0 auto;line-height:1.6">${message}</p>
  <p style="margin-top:32px"><a href="/" style="color:#E8552E;text-decoration:none;font-size:14px">Back to Particle Post</a></p>
</body></html>`;

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
