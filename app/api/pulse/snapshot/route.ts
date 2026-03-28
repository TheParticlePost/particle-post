import { NextResponse } from "next/server";
import { getPulseSnapshot } from "@/lib/pulse/queries";

export const revalidate = 1800; // ISR: 30 minutes

export async function GET() {
  const data = await getPulseSnapshot();
  return NextResponse.json(data);
}
