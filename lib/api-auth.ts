/**
 * Shared admin verification for API routes and React Server Components.
 *
 * - `verifyAdmin(req)`: use inside route handlers — pulls cookies from the
 *   incoming NextRequest.
 * - `verifyAdminServer()`: use inside Server Components — pulls cookies from
 *   `next/headers`. Mirrors the API helper so admin gating logic stays in
 *   one place.
 */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerComponentClient } from "@/lib/supabase/server";

export async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // API route — cookie writes handled by middleware
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

/**
 * Server Component variant of verifyAdmin. Use inside async page or layout
 * components — no NextRequest needed because cookies come from next/headers.
 *
 * Returns false on missing config, missing session, or non-admin role.
 * Never throws — failure modes degrade to "not admin".
 */
export async function verifyAdminServer(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return profile?.role === "admin";
  } catch {
    return false;
  }
}

/** Service-role Supabase client for admin write operations. */
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
