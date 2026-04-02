import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const GITHUB_REPO = "TheParticlePost/particle-post";
const WORKFLOW = "human-assisted-post.yml";

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

export async function POST(req: NextRequest) {
  const ghPat = process.env.GH_PAT;
  if (!ghPat) {
    return NextResponse.json(
      { error: "GitHub token not configured" },
      { status: 500 }
    );
  }

  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { topic, sources, keyPoints, slot } = body;

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return NextResponse.json(
      { error: "Topic is required" },
      { status: 400 }
    );
  }

  const validSlots = ["morning", "evening"];
  if (slot && !validSlots.includes(slot)) {
    return NextResponse.json(
      { error: "Slot must be 'morning' or 'evening'" },
      { status: 400 }
    );
  }

  // Convert newline-separated text to semicolon-separated for CLI arg passing
  const sourcesStr = typeof sources === "string"
    ? sources.split("\n").map((s: string) => s.trim()).filter(Boolean).join(";")
    : "";
  const keyPointsStr = typeof keyPoints === "string"
    ? keyPoints.split("\n").map((s: string) => s.trim()).filter(Boolean).join(";")
    : "";

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghPat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            topic: topic.trim(),
            sources: sourcesStr,
            key_points: keyPointsStr,
            slot: slot || "morning",
          },
        }),
      }
    );

    if (resp.status === 204) {
      return NextResponse.json({
        success: true,
        message: "Human-assisted post workflow triggered. A PR will be created for review.",
      });
    }

    const errorText = await resp.text();
    return NextResponse.json(
      { error: `GitHub API error: ${resp.status} ${errorText}` },
      { status: resp.status }
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to trigger workflow: ${err}` },
      { status: 500 }
    );
  }
}
