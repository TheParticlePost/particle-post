import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { data: subscribers } = await sb
    .from("subscribers")
    .select("email, status, subscribed_at, source")
    .order("subscribed_at", { ascending: false });

  if (!subscribers || subscribers.length === 0) {
    return new NextResponse("email,status,subscribed_at,source\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=subscribers.csv",
      },
    });
  }

  const header = "email,status,subscribed_at,source";
  const rows = subscribers.map(
    (s) => `${s.email},${s.status},${s.subscribed_at},${s.source || ""}`
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
