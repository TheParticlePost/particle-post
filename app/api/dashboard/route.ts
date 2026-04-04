import { NextRequest, NextResponse } from "next/server";
import { verifySpecialist } from "@/lib/api-auth-specialist";
import { getServiceClient } from "@/lib/api-auth";
import type { DashboardStats } from "@/lib/specialists/types";

export async function GET(req: NextRequest) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = getServiceClient();
    const { specialistId, specialist } = auth;

    // Get lead counts
    const { count: totalLeads } = await supabase
      .from("specialist_leads")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", specialistId);

    const { count: newLeads } = await supabase
      .from("specialist_leads")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", specialistId)
      .eq("status", "new");

    const { count: respondedLeads } = await supabase
      .from("specialist_leads")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", specialistId)
      .eq("status", "responded");

    // Get match count
    const { count: matchCount } = await supabase
      .from("automatch_results")
      .select("*", { count: "exact", head: true })
      .eq("specialist_id", specialistId);

    const total = totalLeads ?? 0;
    const responded = respondedLeads ?? 0;
    const responseRate = total > 0 ? responded / total : 0;

    // Get recent leads
    const { data: recentLeads } = await supabase
      .from("specialist_leads")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false })
      .limit(5);

    const stats: DashboardStats = {
      totalLeads: total,
      newLeads: newLeads ?? 0,
      profileViews: specialist.profile_views,
      avgRating: specialist.avg_rating,
      totalReviews: specialist.total_reviews,
      matchCount: matchCount ?? 0,
      responseRate: Math.round(responseRate * 100),
    };

    return NextResponse.json({
      stats,
      recentLeads: recentLeads ?? [],
      specialist: {
        display_name: specialist.display_name,
        slug: specialist.slug,
        is_available: specialist.is_available,
        is_verified: specialist.is_verified,
        is_featured: specialist.is_featured,
        status: specialist.status,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
