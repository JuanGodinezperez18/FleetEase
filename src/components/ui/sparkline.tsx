"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Array of numeric values (oldest → newest). Empty = no render. */
  data?: number[];
  /** Height in px */
  height?: number;
  /** Stroke / fill color (defaults to FleetEase lime) */
  color?: string;
  className?: string;
  /** When true, uses muted/negative tone */
  negative?: boolean;
}

/**
 * Mini sparkline for KPI cards. Lightweight, no axes/tooltips.
 * Pass at least 2 points for a meaningful trend.
 */
export function Sparkline({
  data = [],
  height = 32,
  color = "#d7ff3f",
  className,
  negative = false,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const stroke = negative ? "#f87171" : color;
  const gradientId = `spark-${negative ? "neg" : "pos"}-${data.length}`;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
