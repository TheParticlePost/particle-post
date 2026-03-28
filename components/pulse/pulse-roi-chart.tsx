"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { chartColors } from "@/lib/tokens";
import type { IndustryRoi } from "@/lib/pulse/types";

interface PulseRoiChartProps {
  data: IndustryRoi[];
}

export function PulseRoiChart({ data }: PulseRoiChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload as IndustryRoi;
    return (
      <div className="bg-bg-high border border-border-ghost rounded-lg px-4 py-3">
        <p className="font-mono text-caption text-text-muted mb-1">{label}</p>
        <p className="font-mono text-data text-text-primary font-medium">
          {item.roi_multiplier}x ROI
        </p>
        <p className="font-mono text-caption text-text-muted">
          Payback: {item.median_payback_months} months · n={item.sample_size}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(320, data.length * 42)}>
      <BarChart data={data} layout="vertical" barSize={20}>
        <CartesianGrid
          stroke="var(--border-solid)"
          strokeWidth={0.5}
          horizontal={false}
        />
        <XAxis
          type="number"
          stroke="var(--text-muted)"
          fontSize={12}
          fontFamily="var(--font-mono)"
          tickLine={false}
          axisLine={{ stroke: "var(--border-solid)", strokeWidth: 0.5 }}
          tickFormatter={(v) => `${v}x`}
          domain={[0, 5]}
        />
        <YAxis
          type="category"
          dataKey="industry"
          stroke="var(--text-muted)"
          fontSize={12}
          fontFamily="var(--font-mono)"
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="roi_multiplier" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={chartColors[i % chartColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
