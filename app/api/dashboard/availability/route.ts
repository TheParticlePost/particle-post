import { NextRequest, NextResponse } from "next/server";
import { verifySpecialist } from "@/lib/api-auth-specialist";
import { getServiceClient } from "@/lib/api-auth";

export async function PATCH(req: NextRequest) {
  const auth = await verifySpecialist(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (typeof body.is_available !== "boolean") {
      return NextResponse.json({ error: "is_available must be a boolean" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("specialists")
      .update({ is_available: body.is_available })
      .eq("id", auth.specialistId)
      .select("is_available")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
    }

    return NextResponse.json({ is_available: data.is_available });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
