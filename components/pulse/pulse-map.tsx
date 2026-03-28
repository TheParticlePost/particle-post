"use client";

import { useState, memo } from "react";
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

interface PulseMapProps {
  adoptionData: AdoptionData[];
  caseStudies: CaseStudy[];
}

function PulseMapInner({ adoptionData, caseStudies }: PulseMapProps) {
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
                    stroke="var(--border-solid)"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: data ? "var(--accent)" : "var(--bg-bright)",
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

          {/* Case study markers */}
          {caseStudies.map((cs) => (
            <Marker key={cs.id || cs.company} coordinates={[cs.lng, cs.lat]}>
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

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(232,85,46,0.08)" }} />
          <span className="font-mono text-caption text-text-muted">0–20%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(232,85,46,0.30)" }} />
          <span className="font-mono text-caption text-text-muted">40–60%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(232,85,46,0.70)" }} />
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
