import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: campaigns } = await sb
    .from("outreach_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  // For each campaign, load targets and emails
  const enriched = await Promise.all(
    (campaigns || []).map(async (c) => {
      const { data: targets } = await sb
        .from("outreach_targets")
        .select("*")
        .eq("campaign_id", c.id)
        .order("created_at", { ascending: false });

      const { data: emails } = await sb
        .from("outreach_emails")
        .select("*")
        .in(
          "target_id",
          (targets || []).map((t) => t.id)
        )
        .order("sequence_step");

      return { ...c, targets: targets || [], emails: emails || [] };
    })
  );

  return NextResponse.json({ campaigns: enriched });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("outreach_campaigns")
    .insert({ name })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ campaign: data });
}
