import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { startOnPageAudit, getOnPageResults } from "@/lib/dataforseo";

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
// POST /api/seo/audit — Start a new on-page audit
//
// Request body (optional):
//   { "domain": "example.com" }
//
// Response:
//   { "taskId": "..." }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
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

  let domain: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    domain = body?.domain || undefined;
  } catch {
    // no body — use default domain
  }

  try {
    const taskId = await startOnPageAudit(domain);
    return NextResponse.json({ taskId });
  } catch (err) {
    console.error("[seo/audit] Failed to start audit:", err);
    return NextResponse.json(
      {
        error: "Failed to start on-page audit",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/seo/audit?taskId=xxx — Get audit results
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
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { error: "taskId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const results = await getOnPageResults(taskId);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[seo/audit] Failed to get results:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch audit results",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
