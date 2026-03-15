"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

interface ScoreGaugeProps {
  score: number;
  label: string;
  wcagStatus: "Pass" | "Conditional Pass" | "Fail";
  tooltipTitle?: string;
  tooltipBody?: string;
  description?: string;
}

export function ScoreGauge({ score, label, wcagStatus, tooltipTitle, tooltipBody, description }: ScoreGaugeProps) {
  const scoreHue = wcagStatus === "Fail" ? 0 : score >= 75 ? 142 : score >= 55 ? 38 : 0;

  return (
    <Tooltip.Provider delayDuration={200}>
    <div className="premium-card rounded-md p-6 flex flex-col items-center justify-center text-center relative overflow-hidden w-full">
      {tooltipBody && (
        <div className="absolute top-3 right-3 z-10">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                aria-label={tooltipTitle ?? "About compliance score"}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                align="start"
                sideOffset={6}
                className="z-50 max-w-[320px] rounded-md bg-slate-900 px-4 py-3.5 text-xs leading-relaxed text-slate-300 shadow-xl animate-in fade-in-0 zoom-in-95"
              >
                {tooltipTitle && <p className="font-bold text-white text-[13px] mb-2">{tooltipTitle}</p>}
                <p>{tooltipBody}</p>
                <Tooltip.Arrow className="fill-slate-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      )}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <svg
          className="w-32 h-32 text-slate-900"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <div className="relative w-32 h-32 mb-4" role="img" aria-label={`Compliance score: ${score} out of 100`}>
        <svg className="w-full h-full score-gauge" viewBox="0 0 36 36">
          <circle className="score-gauge-bg" cx="18" cy="18" r="16" />
          <circle
            className="score-gauge-val"
            cx="18"
            cy="18"
            r="16"
            stroke={`hsl(${scoreHue}, 70%, 50%)`}
            strokeDasharray={`${score}, 100`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-slate-900">{score}</span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
            Score
          </span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">{label} Compliance</h3>
      <p className="text-xs font-medium text-slate-500 max-w-50 leading-snug">
        {description ?? "Based on automated accessibility technical checks."}
      </p>
    </div>
    </Tooltip.Provider>
  );
}
