"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { chartColors } from "@/lib/tokens";

interface ComparisonBarProps {
  data: { label: string; actual: number; estimate?: number }[];
  title?: string;
}

export function ComparisonBar({ data, title }: ComparisonBarProps) {
  const hasEstimate = data.some((d) => d.estimate !== undefined);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-high border border-border-ghost rounded-lg px-3 py-2">
        <p className="font-mono text-caption text-text-muted mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="font-mono text-data text-text-primary">
            {p.name}: {p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {title && (
        <h4 className="font-display text-display-sm text-text-primary mb-4">
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
        <BarChart data={data} layout="vertical" barGap={4}>
          <XAxis
            type="number"
            stroke="var(--text-muted)"
            fontSize={12}
            fontFamily="var(--font-mono)"
            tickLine={false}
            axisLine={{ stroke: "var(--border-solid)", strokeWidth: 0.5 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="var(--text-muted)"
            fontSize={12}
            fontFamily="var(--font-mono)"
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="actual"
            name="Actual"
            fill={chartColors[0]}
            radius={[0, 3, 3, 0]}
          />
          {hasEstimate && (
            <Bar
              dataKey="estimate"
              name="Estimate"
              fill={chartColors[1]}
              radius={[0, 3, 3, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
