import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import { startOnPageAudit, getOnPageResults } from "@/lib/dataforseo";

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
