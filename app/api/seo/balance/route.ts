import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import { getAccountBalance } from "@/lib/dataforseo";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const balance = await getAccountBalance();
    return NextResponse.json(balance);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch balance: ${err}` },
      { status: 502 }
    );
  }
}
