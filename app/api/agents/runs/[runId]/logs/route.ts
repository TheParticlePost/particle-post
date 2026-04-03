import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import { getRunLogs } from "@/lib/github-actions";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const id = parseInt(runId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid runId" }, { status: 400 });
  }

  try {
    const logs = await getRunLogs(id);
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch logs: ${err}` },
      { status: 502 }
    );
  }
}
