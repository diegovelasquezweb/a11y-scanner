"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import type { SeverityTotals } from "@/types/scan";
import type { SeverityLevel } from "@diegovelasquezweb/a11y-engine";

const ORDER_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: "border-rose-500",    textColor: "text-rose-600" },
  2: { color: "border-orange-500",  textColor: "text-orange-700" },
  3: { color: "border-amber-400",   textColor: "text-amber-700" },
  4: { color: "border-emerald-500", textColor: "text-emerald-700" },
};

interface SeverityCardsProps {
  totals: SeverityTotals;
  severityLevels?: SeverityLevel[];
  tooltipTitle?: string;
  tooltipBody?: string;
}

export function SeverityCards({ totals, severityLevels = [], tooltipTitle, tooltipBody }: SeverityCardsProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
    <div className="grid grid-cols-2 gap-4 h-full">
      {severityLevels.map((level) => {
        const { color, textColor } = ORDER_COLORS[level.order] ?? ORDER_COLORS[4];
        const key = level.id as keyof SeverityTotals;
        const description = level.shortDescription;
        return (
        <div
          key={key}
          className={`premium-card p-5 rounded-md border-l-[6px] ${color} flex flex-col justify-between`}
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className={`text-[10px] font-bold ${textColor} uppercase tracking-widest`}
            >
              {key}
            </span>
            {key === "Critical" && tooltipBody && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    aria-label={tooltipTitle ?? "About severity breakdown"}
                    className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="bottom"
                    align="end"
                    sideOffset={6}
                    className="z-50 max-w-[320px] rounded-md bg-slate-900 px-4 py-3.5 text-xs leading-relaxed text-slate-300 shadow-xl animate-in fade-in-0 zoom-in-95"
                  >
                    {tooltipTitle && <p className="font-bold text-white text-[13px] mb-2">{tooltipTitle}</p>}
                    <p>{tooltipBody}</p>
                    <Tooltip.Arrow className="fill-slate-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </div>
          <div className="text-4xl font-black text-slate-900">{totals[key]}</div>
          <p className="text-[10px] text-slate-600 font-medium mt-1 leading-tight">
            {description}
          </p>
        </div>
        );
      })}
    </div>
    </Tooltip.Provider>
  );
}
