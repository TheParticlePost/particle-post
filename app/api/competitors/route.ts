import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: competitors } = await sb
    .from("competitors")
    .select("*")
    .order("name");

  const { data: recentContent } = await sb
    .from("competitor_content")
    .select("*, competitors(name)")
    .order("discovered_at", { ascending: false })
    .limit(20);

  const mapped = (recentContent || []).map((c) => ({
    ...c,
    competitor_name:
      (c.competitors as { name: string } | null)?.name ?? "Unknown",
    competitors: undefined,
  }));

  return NextResponse.json({
    competitors: competitors || [],
    recentContent: mapped,
  });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, url } = await req.json();
  if (!name || !url) {
    return NextResponse.json(
      { error: "name and url are required" },
      { status: 400 }
    );
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("competitors")
    .insert({ name, url })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ competitor: data });
}
