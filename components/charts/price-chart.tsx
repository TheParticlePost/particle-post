"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { chartColors } from "@/lib/tokens";

interface PriceChartProps {
  data: { date: string; value: number }[];
  title?: string;
  color?: "vermillion" | "blue" | "amber";
  showArea?: boolean;
}

const colorMap = {
  vermillion: chartColors[0],
  blue: chartColors[1],
  amber: chartColors[2],
};

export function PriceChart({
  data,
  title,
  color = "vermillion",
  showArea = false,
}: PriceChartProps) {
  const strokeColor = colorMap[color];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-high border border-border-ghost rounded-lg px-3 py-2">
        <p className="font-mono text-caption text-text-muted">{label}</p>
        <p className="font-mono text-data text-text-primary font-medium">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  };

  const Chart = showArea ? AreaChart : LineChart;

  return (
    <div className="w-full">
      {title && (
        <h4 className="font-display text-display-sm text-text-primary mb-4">
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <Chart data={data}>
          <XAxis
            dataKey="date"
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
            tickFormatter={(v) => `$${v.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          {showArea ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fill={strokeColor}
              fillOpacity={0.08}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor }}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
