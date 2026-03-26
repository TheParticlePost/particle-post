import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip auth entirely if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  try {
    const { updateSession } = await import("@/lib/supabase/middleware");
    return await updateSession(request);
  } catch {
    // If Supabase middleware fails, let the request through
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|json)$).*)",
  ],
};
