import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getKeywordRankings } from "@/lib/dataforseo";
import * as fs from "fs/promises";
import * as path from "path";

// ---------------------------------------------------------------------------
// Admin verification (matches pattern from app/api/agents/human-post)
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
      setAll() {
        // API route — cookie writes handled by middleware
      },
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
    return NextResponse.json(placeholders);
  }

  try {
    const rankings = await getKeywordRankings(keywords);
    return NextResponse.json(rankings);
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
    return NextResponse.json(placeholders);
  }
}
