"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  lime: "#d7ff3f",
  green: "#34d399",
  red: "#f87171",
  blue: "#60a5fa",
  amber: "#fbbf24",
  orange: "#fb923c",
};

interface SparklineProps {
  /** Array of numeric values (oldest → newest). Empty = no render. */
  data?: number[];
  /** Height in px */
  height?: number;
  /** Hex color or named token: lime | green | red | blue | amber | orange */
  color?: string;
  className?: string;
  /** When true, forces negative (red) tone */
  negative?: boolean;
  /** Reserved for future dots; currently unused for performance */
  showDots?: boolean;
  /** Whether to animate the area (default true) */
  animate?: boolean;
}

function resolveColor(color: string | undefined, negative: boolean): string {
  if (negative) return COLOR_MAP.red;
  if (!color) return COLOR_MAP.lime;
  if (color.startsWith("#")) return color;
  return COLOR_MAP[color] ?? COLOR_MAP.lime;
}

/**
 * Mini sparkline for KPI cards. Lightweight, no axes/tooltips.
 * Pass at least 2 points for a meaningful trend.
 */
export function Sparkline({
  data = [],
  height = 32,
  color = "lime",
  className,
  negative = false,
  showDots: _showDots = false,
  animate = true,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const stroke = resolveColor(color, negative);
  const gradientId = `spark-${stroke.replace("#", "")}-${data.length}`;

  return (
    <div className={cn("w-full", className)} style={{ height }} aria-hidden="true">
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
            isAnimationActive={animate}
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
