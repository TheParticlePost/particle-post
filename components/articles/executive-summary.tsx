import { OverlineLabel } from "@/components/ui/overline-label";

interface ExecutiveSummaryProps {
  /** 50-75 word verdict shown above the cover image. Sourced from the
   *  article frontmatter `executive_summary` field, populated either by
   *  the writer pipeline (for new articles) or the
   *  pipeline/scripts/backfill_executive_summaries.py one-shot (for
   *  legacy articles). */
  summary: string;
}

/**
 * "In brief" component — the TL;DR a finance executive wants in 30 seconds
 * before deciding whether to read the full piece. Renders between the
 * article header divider and the cover image on /posts/[slug]/.
 *
 * Visual treatment uses the editorial-stripe pattern from DESIGN.md —
 * vermillion left border, no rounded corners, no shadow, no background
 * fill. Sized to match the 760px article body width.
 */
export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  return (
    <aside
      aria-label="In brief"
      className="max-w-[760px] mx-auto mb-10 border-l-2 border-accent pl-5 py-1"
    >
      <OverlineLabel className="mb-2 block">In brief</OverlineLabel>
      <p className="text-body-md text-text-primary leading-relaxed m-0">
        {summary}
      </p>
    </aside>
  );
}
