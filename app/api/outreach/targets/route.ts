import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    campaign_id,
    site_url,
    site_name,
    contact_email,
    contact_name,
    broken_link_url,
    our_replacement_url,
  } = body;

  if (!site_url) {
    return NextResponse.json(
      { error: "site_url required" },
      { status: 400 }
    );
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("outreach_targets")
    .insert({
      campaign_id: campaign_id || null,
      site_url,
      site_name: site_name || null,
      contact_email: contact_email || null,
      contact_name: contact_name || null,
      broken_link_url: broken_link_url || null,
      our_replacement_url: our_replacement_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ target: data });
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  for (const key of [
    "site_url",
    "site_name",
    "contact_email",
    "contact_name",
    "broken_link_url",
    "our_replacement_url",
    "status",
  ]) {
    if (key in updates) allowed[key] = updates[key];
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("outreach_targets")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ target: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { error } = await sb.from("outreach_targets").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
