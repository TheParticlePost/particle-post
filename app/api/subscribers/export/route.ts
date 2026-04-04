import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Audit log: identify the admin performing the export
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll() { /* read-only */ },
    },
  });
  const { data: { user } } = await authClient.auth.getUser();
  console.warn(
    `[AUDIT] Subscriber CSV export by user=${user?.id ?? "unknown"} email=${user?.email ?? "unknown"} at=${new Date().toISOString()} ip=${req.headers.get("x-forwarded-for") ?? "unknown"}`
  );

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

  // Escape CSV fields to prevent formula injection and handle commas/quotes
  function escapeCsv(field: string): string {
    if (!field) return "";
    // Prefix formula-triggering characters to prevent CSV injection
    if (/^[=+\-@\t\r]/.test(field)) {
      field = "'" + field;
    }
    // Quote fields containing commas, quotes, or newlines
    if (/[",\n\r]/.test(field)) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  const header = "email,status,subscribed_at,source";
  const rows = subscribers.map(
    (s) =>
      `${escapeCsv(s.email)},${escapeCsv(s.status)},${escapeCsv(s.subscribed_at)},${escapeCsv(s.source || "")}`
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
