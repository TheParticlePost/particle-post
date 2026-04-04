import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Protected routes: redirect to login if not authenticated
    if (
      !user &&
      (pathname.startsWith("/admin") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/specialists/register") ||
        pathname.startsWith("/dashboard"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const safeRedirect = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
      url.searchParams.set("redirect", safeRedirect);
      return NextResponse.redirect(url);
    }

    // Admin routes: check role in profiles table
    if (user && pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }

    // Dashboard routes: check specialist status
    if (user && pathname.startsWith("/dashboard")) {
      const { data: specialist } = await supabase
        .from("specialists")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!specialist || specialist.status !== "approved") {
        const url = request.nextUrl.clone();
        url.pathname = "/specialists/register";
        return NextResponse.redirect(url);
      }
    }

    // Already authenticated: redirect away from auth pages
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    // Log auth errors for debugging — silent failures here are dangerous
    console.error("Middleware auth error:", error);

    const pathname = request.nextUrl.pathname;

    // Fail closed for admin routes — never allow unauthenticated access
    if (pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // For other protected routes, redirect to login on auth failure
    if (
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/specialists/register")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const safeRedirect = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
      url.searchParams.set("redirect", safeRedirect);
      return NextResponse.redirect(url);
    }

    // Public routes: let through even if auth check failed
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|json)$).*)",
  ],
};
