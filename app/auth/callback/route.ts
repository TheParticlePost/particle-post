import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  // Validate redirect: must be relative path, no protocol or double slashes
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed — redirect to error page
  return NextResponse.redirect(`${origin}/auth-error?error=Could+not+authenticate+user`);
}
