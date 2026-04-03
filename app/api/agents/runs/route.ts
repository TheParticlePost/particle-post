import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import { listWorkflowRuns } from "@/lib/github-actions";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflow = req.nextUrl.searchParams.get("workflow");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "5", 10);

  if (!workflow) {
    return NextResponse.json(
      { error: "workflow query param required" },
      { status: 400 }
    );
  }

  try {
    const runs = await listWorkflowRuns(workflow, limit);
    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch runs: ${err}` },
      { status: 502 }
    );
  }
}
