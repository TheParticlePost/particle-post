"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface TimeSeriesChartProps {
  title?: string;
  // Accepts either:
  //   JSON:  [{"x":"2021","y":45},...]  or  [{"x":"2021","series-a":45,"series-b":30},...]
  //   CSV:   "2021:45,2022:62,2023:78"  (single series)
  data: string;
  xLabel?: string;
  yLabel?: string;
  yUnit?: string;  // appended to axis / tooltip values, e.g. "%", "$B"
  source?: string;
  // Optional comma-separated list of series keys when data is multi-series JSON
  series?: string;
}

interface Row {
  x: string;
  [k: string]: string | number;
}

function parseData(raw: string): { rows: Row[]; keys: string[] } {
  if (!raw) return { rows: [], keys: [] };
  const trimmed = raw.trim();

  // JSON mode
  if (trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      if (!Array.isArray(json) || json.length === 0) return { rows: [], keys: [] };
      const rows = json.map((r: unknown) => {
        const obj = (r ?? {}) as Record<string, unknown>;
        const out: Row = { x: String(obj.x ?? obj.year ?? obj.date ?? obj.label ?? "") };
        for (const [k, v] of Object.entries(obj)) {
          if (k === "x" || k === "year" || k === "date" || k === "label") continue;
          const n = Number(v);
          if (!Number.isNaN(n)) out[k] = n;
        }
        return out;
      });
      const keySet = new Set<string>();
      for (const r of rows) {
        for (const k of Object.keys(r)) {
          if (k !== "x") keySet.add(k);
        }
      }
      return { rows, keys: Array.from(keySet) };
    } catch {
      // fall through
    }
  }

  // CSV: "2021:45,2022:62" → single series named "value"
  const rows: Row[] = trimmed
    .split(",")
    .map((pair) => {
      const colon = pair.lastIndexOf(":");
      if (colon < 0) return null;
      const x = pair.slice(0, colon).trim();
      const valStr = pair.slice(colon + 1).trim().replace(/[^0-9.\-]/g, "");
      const value = parseFloat(valStr);
      if (Number.isNaN(value)) return null;
      return { x, value } as Row;
    })
    .filter((r): r is Row => r !== null);

  return { rows, keys: ["value"] };
}

const TICK_COLOR = "var(--text-muted)";
const GRID_COLOR = "var(--border-ghost)";
const ACCENT = "var(--accent)";
// Secondary series colors for multi-line charts. Ordered so first
// non-primary series is visibly distinct from vermillion.
const SECONDARY_COLORS = ["#2DD4BF", "#F59E0B", "#3B82F6", "#A78BFA", "#F472B6"];

function formatValue(v: number, unit: string | undefined): string {
  const u = unit ?? "";
  if (u === "%") return `${v}%`;
  if (u.startsWith("$")) {
    // "$B" / "$M" / "$K" — apply the unit
    const suffix = u.slice(1);
    return `$${v.toLocaleString()}${suffix}`;
  }
  return `${v.toLocaleString()}${u}`;
}

export function TimeSeriesChart({
  title,
  data,
  xLabel,
  yLabel,
  yUnit,
  source,
  series: seriesRaw,
}: TimeSeriesChartProps) {
  const { rows, keys } = parseData(data);
  if (rows.length === 0 || keys.length === 0) return null;

  // Allow explicit series override from the shortcode
  const seriesKeys = seriesRaw
    ? seriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : keys;

  return (
    <figure className="my-8 rounded-md border border-border-ghost bg-bg-high p-5 not-prose">
      {title && (
        <h4 className="font-display text-display-sm text-text-primary mb-4 leading-snug">
          {title}
        </h4>
      )}

      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 16, right: 32, left: 16, bottom: xLabel ? 32 : 16 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 3" />
            <XAxis
              dataKey="x"
              stroke={TICK_COLOR}
              tick={{ fill: TICK_COLOR, fontSize: 12, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={{ stroke: GRID_COLOR }}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -20,
                      fill: TICK_COLOR,
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                    }
                  : undefined
              }
            />
            <YAxis
              stroke={TICK_COLOR}
              tick={{ fill: TICK_COLOR, fontSize: 12, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={{ stroke: GRID_COLOR }}
              tickFormatter={(v: number) =>
                v >= 1e9
                  ? `${(v / 1e9).toFixed(1)}B`
                  : v >= 1e6
                  ? `${(v / 1e6).toFixed(1)}M`
                  : v >= 1e3
                  ? `${(v / 1e3).toFixed(1)}K`
                  : v.toString()
              }
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      fill: TICK_COLOR,
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      offset: 0,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-base)",
                border: `1px solid ${GRID_COLOR}`,
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-primary)", marginBottom: 4 }}
              itemStyle={{ color: ACCENT, padding: 0 }}
              formatter={(value) => formatValue(Number(value ?? 0), yUnit)}
            />
            <ReferenceLine y={0} stroke={GRID_COLOR} />
            {seriesKeys.length > 1 && (
              <Legend
                wrapperStyle={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: TICK_COLOR,
                  paddingTop: 12,
                }}
              />
            )}
            {seriesKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={i === 0 ? ACCENT : SECONDARY_COLORS[(i - 1) % SECONDARY_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2, fill: "var(--bg-base)" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name={key === "value" ? (yLabel ?? "Value") : key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {source && (
        <figcaption className="mt-4 text-caption font-mono uppercase tracking-wider text-text-muted border-t border-border-ghost pt-3">
          Source: {source}
        </figcaption>
      )}
    </figure>
  );
}
