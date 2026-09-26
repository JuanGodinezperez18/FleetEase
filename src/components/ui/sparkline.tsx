"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
  /** Show end/start dots */
  showDots?: boolean;
  /** Whether to animate the line draw (default true) */
  animate?: boolean;
  /** Duration of the draw animation in ms */
  animationDuration?: number;
}

function resolveColor(color: string | undefined, negative: boolean): string {
  if (negative) return COLOR_MAP.red;
  if (!color) return COLOR_MAP.lime;
  if (color.startsWith("#")) return color;
  return COLOR_MAP[color] ?? COLOR_MAP.lime;
}

/** Build a smooth-ish monotone path (Catmull-Rom → cubic) for the sparkline. */
function buildPath(
  points: { x: number; y: number }[],
  width: number,
  height: number
): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  if (points.length === 1) {
    const p = points[0];
    return {
      line: `M ${p.x} ${p.y}`,
      area: `M ${p.x} ${height} L ${p.x} ${p.y} L ${p.x} ${height} Z`,
    };
  }

  // Simple monotone-ish cubic via midpoints
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${last.x} ${height} L ${first.x} ${height} Z`;

  return { line, area };
}

/**
 * Mini sparkline for KPI cards — Bencho-inspired draw animation.
 * Lightweight custom SVG (no Recharts) for precise stroke-dash draw + soft area.
 */
export function Sparkline({
  data = [],
  height = 32,
  color = "lime",
  className,
  negative = false,
  showDots = false,
  animate = true,
  animationDuration = 900,
}: SparklineProps) {
  const uid = useId().replace(/:/g, "");
  const [drawn, setDrawn] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setDrawn(true);
      return;
    }
    setDrawn(false);
    // Trigger draw on next frame so CSS transition applies
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [data, animate]);

  const stroke = resolveColor(color, negative);
  const gradientId = `spark-fill-${uid}`;
  const filterId = `spark-glow-${uid}`;

  const { points, pathLength, lineD, areaD } = useMemo(() => {
    if (!data || data.length < 2) {
      return { points: [] as { x: number; y: number }[], pathLength: 0, lineD: "", areaD: "" };
    }

    const w = 100; // viewBox width
    const h = height;
    const padY = 3;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: padY + (1 - (v - min) / range) * (h - padY * 2),
    }));

    const { line, area } = buildPath(pts, w, h);

    // Approximate path length for dasharray (good enough for sparkline scale)
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      len += Math.hypot(dx, dy);
    }
    // Extra for curves
    len *= 1.15;

    return { points: pts, pathLength: len, lineD: line, areaD: area };
  }, [data, height]);

  if (!data || data.length < 2) return null;

  return (
    <div className={cn("w-full", className)} style={{ height }} aria-hidden="true">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.38} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft area fill — fades in after line starts drawing */}
        <path
          d={areaD}
          fill={`url(#${gradientId})`}
          style={{
            opacity: drawn ? 1 : 0,
            transition: `opacity ${Math.round(animationDuration * 0.55)}ms ease-out ${Math.round(animationDuration * 0.25)}ms`,
          }}
        />

        {/* Line with stroke-dash draw (Bencho-style commitment of the stroke) */}
        <path
          d={lineD}
          fill="none"
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${filterId})`}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: drawn ? 0 : pathLength,
            transition: drawn
              ? `stroke-dashoffset ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : "none",
          }}
        />

        {showDots &&
          points.map((p, i) => {
            const isEnd = i === points.length - 1;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isEnd ? 2.2 : 1.4}
                fill={stroke}
                style={{
                  opacity: drawn ? (isEnd ? 1 : 0.55) : 0,
                  transition: `opacity 280ms ease-out ${Math.round(animationDuration * 0.7 + i * 18)}ms`,
                }}
              />
            );
          })}
      </svg>
    </div>
  );
}
