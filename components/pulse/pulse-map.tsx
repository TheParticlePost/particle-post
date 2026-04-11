"use client";

import { useState, useMemo, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { adoptionToColor } from "@/lib/pulse/color-scale";
import type { AdoptionData, CaseStudy } from "@/lib/pulse/types";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/**
 * Two-or-more case studies in roughly the same place (within ~2° lat/lng)
 * render as a single dot on a world map because pixel resolution at that
 * scale can't distinguish them. Meta (Menlo Park) and Kodiak (Mountain
 * View) are ~11km apart — less than one map pixel.
 *
 * This helper groups markers by a coarse geographic bucket and, for any
 * bucket with 2+ members, spreads them in a small circle around their
 * shared centroid so every case study gets a visible, clickable dot.
 *
 * The offset is applied to the coordinate array — the underlying data is
 * not mutated. `cs.lng` and `cs.lat` stay accurate for any downstream
 * consumer that needs the real company location.
 */
function spreadOverlappingMarkers(
  studies: CaseStudy[],
): Array<CaseStudy & { displayCoords: [number, number] }> {
  const BUCKET_DEG = 2;      // group if within this many degrees
  const SPREAD_RADIUS = 1.5; // offset distance from centroid, in degrees

  const buckets = new Map<string, CaseStudy[]>();
  for (const cs of studies) {
    const key = `${Math.round(cs.lat / BUCKET_DEG)}:${Math.round(cs.lng / BUCKET_DEG)}`;
    const arr = buckets.get(key) ?? [];
    arr.push(cs);
    buckets.set(key, arr);
  }

  const out: Array<CaseStudy & { displayCoords: [number, number] }> = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      const cs = group[0];
      out.push({ ...cs, displayCoords: [cs.lng, cs.lat] });
      continue;
    }

    // 2+ markers in this bucket → spread around the centroid in a circle
    const cx = group.reduce((s, cs) => s + cs.lng, 0) / group.length;
    const cy = group.reduce((s, cs) => s + cs.lat, 0) / group.length;
    // Sort deterministically so the same company is always at the same
    // offset slot across renders (prevents flicker during hot reloads).
    const sorted = [...group].sort((a, b) => a.company.localeCompare(b.company));
    sorted.forEach((cs, i) => {
      const angle = (2 * Math.PI * i) / sorted.length;
      out.push({
        ...cs,
        displayCoords: [
          cx + SPREAD_RADIUS * Math.cos(angle),
          cy + SPREAD_RADIUS * Math.sin(angle),
        ],
      });
    });
  }
  return out;
}

interface PulseMapProps {
  adoptionData: AdoptionData[];
  caseStudies: CaseStudy[];
}

function PulseMapInner({ adoptionData, caseStudies }: PulseMapProps) {
  const spreadCaseStudies = useMemo(
    () => spreadOverlappingMarkers(caseStudies),
    [caseStudies],
  );
  const [tooltip, setTooltip] = useState<{
    content: string;
    x: number;
    y: number;
  } | null>(null);

  const adoptionByCode = new Map(
    adoptionData.map((d) => [d.country_code, d])
  );

  return (
    <div className="relative">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-bg-high border border-border-ghost rounded-lg px-3 py-2 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -120%)" }}
        >
          <p className="font-mono text-data text-text-primary whitespace-nowrap">
            {tooltip.content}
          </p>
        </div>
      )}

      <ComposableMap
        projectionConfig={{ scale: 147, center: [10, 5] }}
        className="w-full"
        style={{ maxHeight: "500px" }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryCode = geo.properties?.ISO_A2 || "";
                const data = adoptionByCode.get(countryCode);
                const fillColor = adoptionToColor(data?.adoption_rate ?? null);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="var(--map-border)"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: data ? "var(--accent)" : "var(--map-border)",
                        outline: "none",
                        cursor: data ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      if (data) {
                        const rect = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                        setTooltip({
                          content: `${data.country_name}: ${data.adoption_rate}% adoption`,
                          x: e.clientX - (rect?.left ?? 0),
                          y: e.clientY - (rect?.top ?? 0),
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>

          {/* Case study markers — coordinates may be offset from cs.lng/cs.lat
              if another case study is in roughly the same place (see
              spreadOverlappingMarkers). */}
          {spreadCaseStudies.map((cs) => (
            <Marker key={cs.id || cs.company} coordinates={cs.displayCoords}>
              <circle
                r={cs.featured ? 5 : 3.5}
                fill="var(--accent)"
                stroke="var(--bg-base)"
                strokeWidth={1.5}
                className="cursor-pointer hover:r-[6] transition-all"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                  setTooltip({
                    content: `${cs.company}: ${cs.outcome_metric}`,
                    x: e.clientX - (rect?.left ?? 0),
                    y: e.clientY - (rect?.top ?? 0),
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => {
                  if (cs.slug) window.location.href = `/posts/${cs.slug}/`;
                }}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend — opacity values must match adoptionToOpacity() in
          lib/pulse/color-scale.ts. */}
      <div className="flex items-center gap-6 mt-4 justify-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm border border-border-ghost" style={{ background: "var(--map-land)" }} />
          <span className="font-mono text-caption text-text-muted">No data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(232,85,46,0.18)" }} />
          <span className="font-mono text-caption text-text-muted">0–20%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(232,85,46,0.45)" }} />
          <span className="font-mono text-caption text-text-muted">40–60%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(232,85,46,0.78)" }} />
          <span className="font-mono text-caption text-text-muted">80–100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="font-mono text-caption text-text-muted">Case Study</span>
        </div>
      </div>
    </div>
  );
}

export const PulseMap = memo(PulseMapInner);
