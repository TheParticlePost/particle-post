import { NextRequest, NextResponse } from "next/server";
import { verifySpecialist } from "@/lib/api-auth-specialist";
import { getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const offset = (page - 1) * limit;

    const supabase = getServiceClient();

    let query = supabase
      .from("specialist_leads")
      .select("*", { count: "exact" })
      .eq("specialist_id", auth.specialistId);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    return NextResponse.json({
      leads: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
