import { NextResponse } from "next/server";
import { getPulseDashboard } from "@/lib/pulse/queries";

export const revalidate = 3600; // ISR: 1 hour

export async function GET() {
  const data = await getPulseDashboard();
  return NextResponse.json(data);
}
