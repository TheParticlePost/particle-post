"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface BarChartProps {
  title?: string;
  // Accepts either:
  //   JSON:  [{"label":"A","value":50}, ...]
  //   CSV:   "Label 1:50,Label 2:62,Label 3:40"
  data: string;
  source?: string;
  xLabel?: string;
  yLabel?: string;
}

interface DataPoint {
  label: string;
  value: number;
}

function parseData(raw: string): DataPoint[] {
  if (!raw) return [];
  const trimmed = raw.trim();

  // Try JSON first
  if (trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json)) {
        return json
          .map((d: unknown) => {
            if (typeof d === "object" && d !== null) {
              const obj = d as Record<string, unknown>;
              const label = String(obj.label ?? obj.name ?? "");
              const value = Number(obj.value ?? obj.y ?? 0);
              return { label, value };
            }
            return null;
          })
          .filter((d): d is DataPoint => d !== null && !Number.isNaN(d.value));
      }
    } catch {
      // Fall through to CSV
    }
  }

  // CSV format: "Label 1:50,Label 2:62"
  return trimmed
    .split(",")
    .map((pair) => {
      const colonIdx = pair.lastIndexOf(":");
      if (colonIdx < 0) return null;
      const label = pair.slice(0, colonIdx).trim();
      const valueStr = pair.slice(colonIdx + 1).trim().replace(/[^0-9.\-]/g, "");
      const value = parseFloat(valueStr);
      if (Number.isNaN(value)) return null;
      return { label, value };
    })
    .filter((d): d is DataPoint => d !== null);
}

const TICK_COLOR = "var(--text-muted)";
const GRID_COLOR = "var(--border-ghost)";
const ACCENT = "var(--accent)";

export function BarChart({ title, data, source, xLabel, yLabel }: BarChartProps) {
  const parsed = parseData(data);
  if (parsed.length === 0) return null;

  // Dynamically choose height: enough for ~48px per bar in vertical layout
  const height = Math.max(260, parsed.length * 44 + 80);

  return (
    <figure className="my-8 rounded-md border border-border-ghost bg-bg-high p-5 not-prose">
      {title && (
        <h4 className="font-display text-display-sm text-text-primary mb-4 leading-snug">
          {title}
        </h4>
      )}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={parsed}
            layout="vertical"
            margin={{ top: 8, right: 56, left: 0, bottom: xLabel ? 28 : 8 }}
          >
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 3" horizontal={false} />
            <XAxis
              type="number"
              stroke={TICK_COLOR}
              tick={{ fill: TICK_COLOR, fontSize: 12, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={{ stroke: GRID_COLOR }}
              label={
                xLabel
                  ? { value: xLabel, position: "insideBottom", offset: -16, fill: TICK_COLOR, fontSize: 12 }
                  : undefined
              }
            />
            <YAxis
              type="category"
              dataKey="label"
              width={180}
              stroke={TICK_COLOR}
              tick={{ fill: "var(--text-secondary)", fontSize: 12, fontFamily: "var(--font-body)" }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "rgba(232, 85, 46, 0.1)" }}
              contentStyle={{
                background: "var(--bg-base)",
                border: `1px solid ${GRID_COLOR}`,
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-primary)" }}
              itemStyle={{ color: ACCENT }}
            />
            <Bar dataKey="value" fill={ACCENT} radius={[0, 2, 2, 0]}>
              <LabelList
                dataKey="value"
                position="right"
                style={{
                  fill: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
                formatter={(value) => {
                  const v = Number(value ?? 0);
                  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
                  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
                  return v.toString();
                }}
              />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      {yLabel && (
        <p className="text-caption font-mono uppercase tracking-wider text-text-muted mt-2">
          Y: {yLabel}
        </p>
      )}
      {source && (
        <figcaption className="mt-3 text-caption font-mono uppercase tracking-wider text-text-muted border-t border-border-ghost pt-3">
          Source: {source}
        </figcaption>
      )}
    </figure>
  );
}
