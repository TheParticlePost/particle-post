import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { data } = await sb
    .from("affiliate_links")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ links: data || [] });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { keyword, url, product_name, commission_rate } = body;

  if (!keyword || !url) {
    return NextResponse.json(
      { error: "keyword and url required" },
      { status: 400 }
    );
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("affiliate_links")
    .insert({
      keyword,
      url,
      product_name: product_name || null,
      commission_rate: commission_rate || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ link: data });
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

  const sb = getServiceClient();

  // Only allow specific fields to be updated
  const allowed: Record<string, unknown> = {};
  if ("active" in updates) allowed.active = updates.active;
  if ("url" in updates) allowed.url = updates.url;
  if ("keyword" in updates) allowed.keyword = updates.keyword;
  if ("product_name" in updates) allowed.product_name = updates.product_name;
  if ("commission_rate" in updates)
    allowed.commission_rate = updates.commission_rate;
  if ("max_insertions_per_article" in updates)
    allowed.max_insertions_per_article = updates.max_insertions_per_article;

  allowed.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from("affiliate_links")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ link: data });
}
