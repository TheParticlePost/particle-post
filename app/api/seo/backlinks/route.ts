import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getBacklinkSummary,
  getReferringDomains,
  getBrokenBacklinks,
} from "@/lib/dataforseo";

// ---------------------------------------------------------------------------
// Admin verification
// ---------------------------------------------------------------------------

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

// ---------------------------------------------------------------------------
// GET /api/seo/backlinks
//
// Query params:
//   ?domain=example.com   (optional, defaults to theparticlepost.com)
//   ?include=referring,broken  (optional, comma-separated extras)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasCredentials =
    !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD;

  if (!hasCredentials) {
    return NextResponse.json(
      { error: "DataForSEO credentials not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") || undefined;
  const include = searchParams.get("include")?.split(",") ?? [];

  try {
    const summary = await getBacklinkSummary(domain);

    const response: Record<string, unknown> = { summary };

    if (include.includes("referring")) {
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);
      response.referringDomains = await getReferringDomains(domain, limit);
    }

    if (include.includes("broken")) {
      response.brokenBacklinks = await getBrokenBacklinks(domain);
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[seo/backlinks] DataForSEO error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch backlink data",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
