import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
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

  if (!link) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Increment click count (fire-and-forget)
  sb.from("affiliate_links")
    .update({ clicks: (link.clicks || 0) + 1 })
    .eq("id", id)
    .then(() => {});

  // Redirect to affiliate URL
  return NextResponse.redirect(link.url, 302);
}
