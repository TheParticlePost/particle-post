import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { competitorId } = await req.json();
  if (!competitorId) {
    return NextResponse.json(
      { error: "competitorId required" },
      { status: 400 }
    );
  }

  const sb = getServiceClient();
  const { data: competitor } = await sb
    .from("competitors")
    .select("name, url")
    .eq("id", competitorId)
    .single();

  if (!competitor) {
    return NextResponse.json(
      { error: "Competitor not found" },
      { status: 404 }
    );
  }

  // Search for recent articles via Tavily
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    return NextResponse.json(
      { error: "TAVILY_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const domain = new URL(competitor.url).hostname;
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `site:${domain} AI finance business 2026`,
        search_depth: "advanced",
        max_results: 10,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Tavily search failed" },
        { status: 502 }
      );
    }

    const tavily = await res.json();
    const results = tavily.results || [];

    let inserted = 0;
    for (const r of results) {
      const { error } = await sb.from("competitor_content").upsert(
        {
          competitor_id: competitorId,
          title: r.title || "Untitled",
          url: r.url,
          topics: [],
          discovered_at: new Date().toISOString(),
        },
        { onConflict: "url" }
      );
      if (!error) inserted++;
    }

    return NextResponse.json({
      success: true,
      articlesFound: results.length,
      inserted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Scan failed: ${err}` },
      { status: 500 }
    );
  }
}
