import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import {
  getBacklinkSummary,
  getReferringDomains,
  getBrokenBacklinks,
} from "@/lib/dataforseo";

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
