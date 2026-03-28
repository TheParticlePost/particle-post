"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { chartColors } from "@/lib/tokens";
import type { TrendPoint } from "@/lib/pulse/types";

interface PulseAdoptionChartProps {
  data: TrendPoint[];
}

export function PulseAdoptionChart({ data }: PulseAdoptionChartProps) {
  const formatted = data.map((d) => ({
    year: new Date(d.date).getFullYear().toString(),
    value: d.value,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-high border border-border-ghost rounded-lg px-3 py-2">
        <p className="font-mono text-caption text-text-muted">{label}</p>
        <p className="font-mono text-data text-text-primary font-medium">
          {payload[0].value}% adoption
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="adoptionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.20} />
            <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="var(--border-solid)"
          strokeWidth={0.5}
          strokeDasharray="none"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          stroke="var(--text-muted)"
          fontSize={12}
          fontFamily="var(--font-mono)"
          tickLine={false}
          axisLine={{ stroke: "var(--border-solid)", strokeWidth: 0.5 }}
        />
        <YAxis
          stroke="var(--text-muted)"
          fontSize={12}
          fontFamily="var(--font-mono)"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColors[0]}
          strokeWidth={2.5}
          fill="url(#adoptionGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
