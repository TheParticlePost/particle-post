/**
 * Cached subscriber count for the homepage and subscribe page social proof.
 *
 * The "Join NN+ leaders" line on the homepage reads from this helper. It's
 * cached for 5 minutes via `unstable_cache` so we don't hit Supabase on every
 * request, and it gracefully degrades to 0 if Supabase is unreachable —
 * `home-content.tsx` then hides the count entirely (see SUBSCRIBER_COUNT_THRESHOLD
 * in lib/constants.ts).
 *
 * The `subscribers` table schema may or may not have a `status` column
 * (its CREATE TABLE statement isn't in the migrations folder). We try the
 * filtered query first and fall back to an unfiltered count if the column
 * doesn't exist — both behaviors are safe.
 */
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function fetchCount(): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return 0;

  try {
    const supabase = await createClient();

    // Try the active-only count first.
    const filtered = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (!filtered.error && filtered.count != null) {
      return filtered.count;
    }

    // Fallback: unfiltered count (e.g. if `status` column doesn't exist).
    const unfiltered = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true });

    if (!unfiltered.error && unfiltered.count != null) {
      return unfiltered.count;
    }

    return 0;
  } catch {
    return 0;
  }
}

export const getSubscriberCount = unstable_cache(
  fetchCount,
  ["subscriber-count-v1"],
  { revalidate: 300, tags: ["subscribers"] }
);
