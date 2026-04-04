import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Simple in-memory rate limiter (best-effort in serverless)
const clickRateMap = new Map<string, { count: number; resetAt: number }>();
const CLICK_RATE_LIMIT = 10;
const CLICK_RATE_WINDOW = 60_000; // 1 minute

function isClickRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = clickRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    clickRateMap.set(ip, { count: 1, resetAt: now + CLICK_RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > CLICK_RATE_LIMIT;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isClickRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const sb = createClient(supabaseUrl, serviceKey);

  // Get the affiliate link
  const { data: link } = await sb
    .from("affiliate_links")
    .select("url, clicks")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (!link?.url) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Validate redirect URL — only allow https
  try {
    const targetUrl = new URL(link.url);
    if (targetUrl.protocol !== "https:") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Increment click count atomically (fire-and-forget)
  sb.from("affiliate_links")
    .update({ clicks: (link.clicks || 0) + 1 })
    .eq("id", id)
    .then(() => {});

  // Redirect to affiliate URL
  return NextResponse.redirect(link.url, 302);
}
