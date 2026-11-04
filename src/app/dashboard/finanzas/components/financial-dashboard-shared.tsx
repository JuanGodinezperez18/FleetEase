"use client";

import React from "react";
import { Sector } from "recharts";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { staggerItem } from "@/lib/animations";

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0e1117]/95 p-3 shadow-2xl backdrop-blur-md">
        <p className="mb-1.5 text-xs font-semibold text-white/80">{label}</p>
        {payload.map((p: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.fill || p.stroke || p.color }}
            />
            <span className="text-xs text-white/50">{p.name}</span>
            <span className="ml-auto text-xs font-medium tabular-nums text-white">
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CHART_COLORS = {
  income: "#34d399",
  expense: "#fb7185",
  flow: "#60a5fa",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.35)",
};

export const PIE_COLORS = [
  "#34d399",
  "#fb7185",
  "#60a5fa",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#2dd4bf",
];

/** Active sector expands + outer glow on hover/tap */
export function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "brightness(1.12)", transition: "all 0.25s ease-out" }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-white text-[11px] font-semibold"
        style={{ pointerEvents: "none" }}
      >
        {payload?.name}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        className="fill-white/60 text-[10px]"
        style={{ pointerEvents: "none" }}
      >
        {`${((percent ?? 0) * 100).toFixed(0)}%`}
      </text>
    </g>
  );
}

export const Section = ({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.section
    variants={staggerItem}
    className={`min-w-0 w-full max-w-full overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)] ${className ?? ""}`}
  >
    <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
      <h2 className="font-heading text-sm font-semibold text-white sm:text-base">{title}</h2>
      {description && <p className="mt-0.5 text-[11px] text-white/40 sm:text-xs">{description}</p>}
    </div>
    <div className="p-3 sm:p-4 md:p-5">{children}</div>
  </motion.section>
);
