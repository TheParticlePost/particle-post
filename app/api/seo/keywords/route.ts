import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import { getKeywordRankings } from "@/lib/dataforseo";
import * as fs from "fs/promises";
import * as path from "path";

// ---------------------------------------------------------------------------
// Load keyword targets from seo_gso_config.json
// ---------------------------------------------------------------------------

async function loadKeywordTargets(): Promise<string[]> {
  try {
    const configPath = path.join(
      process.cwd(),
      "pipeline",
      "config",
      "seo_gso_config.json"
    );
    const raw = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(raw);
    return Array.isArray(config.keyword_targets)
      ? config.keyword_targets
      : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// GET /api/seo/keywords
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keywords = await loadKeywordTargets();

  if (keywords.length === 0) {
    return NextResponse.json(
      { error: "No keyword targets configured in seo_gso_config.json" },
      { status: 404 }
    );
  }

  // Check whether DataForSEO credentials are available
  const hasCredentials =
    !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD;

  if (!hasCredentials) {
    // Return placeholder data so the dashboard still works
    const placeholders = keywords.map((kw) => ({
      keyword: kw,
      position: null,
      url: null,
      searchVolume: null,
      cpc: null,
      competition: null,
      lastChecked: new Date().toISOString(),
      source: "placeholder" as const,
    }));
    return NextResponse.json({ keywords: placeholders });
  }

  try {
    const rankings = await getKeywordRankings(keywords);
    return NextResponse.json({ keywords: rankings });
  } catch (err) {
    console.error("[seo/keywords] DataForSEO error:", err);

    // Fall back to placeholder data
    const placeholders = keywords.map((kw) => ({
      keyword: kw,
      position: null,
      url: null,
      searchVolume: null,
      cpc: null,
      competition: null,
      lastChecked: new Date().toISOString(),
      source: "placeholder" as const,
    }));
    return NextResponse.json({ keywords: placeholders });
  }
}
