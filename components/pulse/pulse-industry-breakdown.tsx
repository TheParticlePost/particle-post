"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { chartColors } from "@/lib/tokens";
import { DataText } from "@/components/ui/data-text";
import type { IndustryRoi } from "@/lib/pulse/types";

interface PulseIndustryBreakdownProps {
  data: IndustryRoi[];
}

export function PulseIndustryBreakdown({ data }: PulseIndustryBreakdownProps) {
  const chartData = data.map((d) => ({
    name: d.industry,
    value: d.sample_size,
    roi: d.roi_multiplier,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-high border border-border-ghost rounded-lg px-3 py-2">
        <p className="font-mono text-data text-text-primary font-medium">
          {payload[0].name}
        </p>
        <p className="font-mono text-caption text-text-muted">
          {payload[0].value} companies surveyed
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      <div className="w-full lg:w-1/2">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={chartColors[i % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full lg:w-1/2 space-y-3">
        {chartData.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: chartColors[i % chartColors.length] }}
            />
            <span className="text-body-sm text-text-body flex-1">{item.name}</span>
            <DataText className="text-text-primary font-medium">{item.roi}x</DataText>
          </div>
        ))}
      </div>
    </div>
  );
}
