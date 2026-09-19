import React from 'react';

export const InfoItem = ({
  icon,
  label,
  value,
  valueClassName = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) => (
  <div className="flex items-start gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/40">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
      <p className={`mt-0.5 font-heading text-sm font-semibold text-white/90 ${valueClassName}`}>{value}</p>
    </div>
  </div>
);
