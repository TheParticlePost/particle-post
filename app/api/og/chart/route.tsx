import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getPostBySlug } from "@/lib/content";

/**
 * Dynamic OG image for a specific chart in a published article.
 *
 * Usage: /api/og/chart?slug=<article-slug>&id=<chart-id>
 *
 * When a reader clicks the LinkedIn share button on a chart, the
 * browser opens LinkedIn's share intent with the article URL +
 * `?chart=<id>` query param. LinkedIn's crawler fetches that article
 * URL to build its preview card. The article page's generateMetadata()
 * reads the `chart` searchParam and swaps `openGraph.images[0]` to
 * point at THIS route with the same slug + id — so the preview card
 * shows the specific chart, not the article's default cover.
 *
 * The image is 1200x630 (LinkedIn's recommended size, also works for
 * Twitter / X summary cards). Rendered via next/og's Satori engine,
 * which supports a subset of CSS (flexbox yes, grid no, SVG paths no).
 * Cached at the edge for 1 hour with SWR.
 */

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

// Design tokens duplicated from globals.css because Satori can't read
// CSS variables at image-response time. Keep these in sync if the dark
// theme palette changes.
const BG_BASE = "#141414";
const BG_CONTAINER = "#1E1E1E";
const BG_HIGH = "#282828";
const ACCENT = "#E8552E";
const TEXT_PRIMARY = "#F5F0EB";
const TEXT_SECONDARY = "#A89E94";
const TEXT_MUTED = "#6E6660";
const BORDER_GHOST = "rgba(90, 65, 59, 0.35)";

interface ParsedChart {
  type: "bar" | "time-series";
  title: string;
  source: string;
  /** For bar charts: [{label, value}, ...]. For time-series: [{label, value}, ...] where label is the x value (year/quarter/etc). */
  points: Array<{ label: string; value: number }>;
}

/**
 * Find the chart shortcode with the given id in the article body and
 * parse its title, data, and source. Returns null if not found.
 */
function extractChart(body: string, chartId: string): ParsedChart | null {
  // Match either {{< bar-chart id="..." ... >}} or {{< time-series-chart id="..." ... >}}
  // The attribute tail is non-greedy and stops at the first >}} sequence.
  const re = new RegExp(
    // eslint-disable-next-line no-useless-escape
    `\\{\\{<\\s*(bar-chart|time-series-chart)\\b([^>]*?id="${escapeRegex(chartId)}"[^>]*?)\\s*>\\}\\}`,
    "s",
  );
  const m = body.match(re);
  if (!m) return null;

  const kind = m[1];
  const attrs = m[2];

  const title = pickAttr(attrs, "title") ?? "";
  const source = pickAttr(attrs, "source") ?? "";
  const dataStr = pickAttr(attrs, "data") ?? "";

  const points = parseCsvData(dataStr);
  if (points.length === 0) return null;

  return {
    type: kind === "time-series-chart" ? "time-series" : "bar",
    title,
    source,
    points,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickAttr(attrs: string, name: string): string | null {
  // Supports both double-quoted and single-quoted attribute values.
  const dbl = new RegExp(`\\b${name}="((?:[^"\\\\]|\\\\.)*)"`);
  const sgl = new RegExp(`\\b${name}='((?:[^'\\\\]|\\\\.)*)'`);
  const dm = attrs.match(dbl);
  if (dm) return dm[1];
  const sm = attrs.match(sgl);
  if (sm) return sm[1];
  return null;
}

function parseCsvData(raw: string): Array<{ label: string; value: number }> {
  if (!raw) return [];
  const trimmed = raw.trim();
  // Don't even try to parse JSON in the OG route — the writer prompt
  // forbids JSON-in-data-attribute and the earlier MDX sanitizer
  // rejects it. CSV format only.
  if (trimmed.startsWith("[")) return [];

  return trimmed
    .split(",")
    .map((pair) => {
      const colonIdx = pair.lastIndexOf(":");
      if (colonIdx < 0) return null;
      const label = pair.slice(0, colonIdx).trim();
      const valueStr = pair
        .slice(colonIdx + 1)
        .trim()
        .replace(/[^0-9.\-]/g, "");
      const value = parseFloat(valueStr);
      if (!Number.isFinite(value)) return null;
      return { label, value };
    })
    .filter((p): p is { label: string; value: number } => p !== null);
}

/** Format a number for display in the OG image — compacts large values. */
function formatValue(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  // Show one decimal for small fractions, integer otherwise
  return Number.isInteger(v) ? v.toString() : v.toFixed(1);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const chartId = searchParams.get("id");

  if (!slug || !chartId) {
    return new Response("Missing slug or id query parameter", { status: 400 });
  }

  const post = getPostBySlug(slug);
  if (!post) {
    return new Response("Post not found", { status: 404 });
  }

  const chart = extractChart(post.content, chartId);
  if (!chart) {
    return new Response("Chart not found in post body", { status: 404 });
  }

  // Top 6 points max so the layout stays legible at 1200x630
  const visiblePoints = chart.points.slice(0, 6);
  const maxValue = Math.max(...visiblePoints.map((p) => Math.abs(p.value)), 1);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: BG_BASE,
          color: TEXT_PRIMARY,
          fontFamily: "sans-serif",
          padding: "48px 56px 56px 56px",
          position: "relative",
        }}
      >
        {/* Vermillion accent stripe — the editorial signature */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 4,
            height: "100%",
            backgroundColor: ACCENT,
          }}
        />

        {/* Overline: brand + publication name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: ACCENT,
            }}
          />
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            Particle Post
          </div>
        </div>

        {/* Chart title as the hero */}
        <div
          style={{
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.1,
            color: TEXT_PRIMARY,
            marginBottom: 32,
            maxWidth: "90%",
          }}
        >
          {chart.title || "Particle Post"}
        </div>

        {/* Chart body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            backgroundColor: BG_CONTAINER,
            border: `1px solid ${BORDER_GHOST}`,
            borderRadius: 8,
            padding: "24px 28px",
            gap: 14,
          }}
        >
          {visiblePoints.map((p, i) => {
            const pct = (Math.abs(p.value) / maxValue) * 100;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 20,
                }}
              >
                <div
                  style={{
                    width: 220,
                    color: TEXT_SECONDARY,
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 24,
                    backgroundColor: BG_HIGH,
                    borderRadius: 4,
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      height: "100%",
                      backgroundColor: ACCENT,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 90,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatValue(p.value)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: source + article URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            fontSize: 14,
            color: TEXT_MUTED,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          <div style={{ maxWidth: "70%" }}>
            {chart.source ? `Source: ${chart.source}` : ""}
          </div>
          <div>theparticlepost.com</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
