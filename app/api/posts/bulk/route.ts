import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";

/**
 * Bulk operations on posts. Delegates to the per-slug API endpoint.
 */
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action: string; slugs: string[]; value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, slugs, value } = body;

  if (!action || !Array.isArray(slugs) || slugs.length === 0) {
    return NextResponse.json(
      { error: "action and non-empty slugs array required" },
      { status: 400 }
    );
  }

  const results: { slug: string; ok: boolean; error?: string }[] = [];

  // Build origin from request
  const origin = req.nextUrl.origin;
  const cookie = req.headers.get("cookie") ?? "";

  for (const slug of slugs) {
    try {
      if (action === "delete") {
        const res = await fetch(`${origin}/api/posts/${slug}`, {
          method: "DELETE",
          headers: { cookie },
        });
        const data = await res.json();
        results.push({
          slug,
          ok: res.ok,
          error: res.ok ? undefined : data.error,
        });
      } else if (action === "update_funnel" && value) {
        const res = await fetch(`${origin}/api/posts/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ funnel_type: value }),
        });
        const data = await res.json();
        results.push({
          slug,
          ok: res.ok,
          error: res.ok ? undefined : data.error,
        });
      } else if (action === "update_schema" && value) {
        const res = await fetch(`${origin}/api/posts/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ schema_type: value }),
        });
        const data = await res.json();
        results.push({
          slug,
          ok: res.ok,
          error: res.ok ? undefined : data.error,
        });
      } else {
        results.push({ slug, ok: false, error: `Unknown action: ${action}` });
      }
    } catch (err) {
      results.push({ slug, ok: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({ succeeded, failed, results });
}
