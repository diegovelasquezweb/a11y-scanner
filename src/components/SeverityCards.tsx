"use client";

import type { SeverityTotals } from "@/types/scan";

const SEVERITY_CONFIG = [
  {
    key: "Critical" as const,
    color: "border-rose-500",
    textColor: "text-rose-600",
    description: "Functional blockers",
  },
  {
    key: "Serious" as const,
    color: "border-orange-500",
    textColor: "text-orange-700",
    description: "Serious impediments",
  },
  {
    key: "Moderate" as const,
    color: "border-amber-400",
    textColor: "text-amber-700",
    description: "Significant friction",
  },
  {
    key: "Minor" as const,
    color: "border-emerald-500",
    textColor: "text-emerald-700",
    description: "Minor violations",
  },
];

interface SeverityCardsProps {
  totals: SeverityTotals;
}

export function SeverityCards({ totals }: SeverityCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {SEVERITY_CONFIG.map(({ key, color, textColor, description }) => (
        <div
          key={key}
          className={`premium-card p-5 rounded-2xl border-l-[6px] ${color}`}
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className={`text-[10px] font-bold ${textColor} uppercase tracking-widest`}
            >
              {key}
            </span>
          </div>
          <div className="text-4xl font-black text-slate-900">{totals[key]}</div>
          <p className="text-[10px] text-slate-600 font-medium mt-1 leading-tight">
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}
