import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_WORKFLOWS: Record<string, string> = {
  "morning-post.yml": "Morning Post",
  "evening-post.yml": "Evening Post",
  "marketing-director.yml": "Marketing Director",
  "security-audit.yml": "Security Audit",
  "content-audit.yml": "Content Audit",
  "ui-designer.yml": "UI Designer",
  "human-assisted-post.yml": "Human-Assisted Post",
};

const GITHUB_REPO = "TheParticlePost/particle-post";

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { cookie: cookieHeader } },
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

  // Verify admin
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const workflow = body.workflow as string;

  if (!workflow || !ALLOWED_WORKFLOWS[workflow]) {
    return NextResponse.json(
      { error: `Invalid workflow. Allowed: ${Object.keys(ALLOWED_WORKFLOWS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghPat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: body.inputs ?? {},
        }),
      }
    );

    if (resp.status === 204) {
      return NextResponse.json({
        success: true,
        message: `${ALLOWED_WORKFLOWS[workflow]} workflow triggered`,
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
