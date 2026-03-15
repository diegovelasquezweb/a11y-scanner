"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Zap, ArrowRight, Info } from "lucide-react";
import type { Finding } from "@/types/scan";

const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-rose-500/20 text-rose-400",
  Serious: "bg-orange-500/20 text-orange-400",
  Moderate: "bg-amber-500/20 text-amber-400",
  Minor: "bg-emerald-500/20 text-emerald-400",
};

interface QuickWinsProps {
  quickWins: Finding[];
  onScrollToIssue: (id: string) => void;
  subtitle?: string;
  tooltipTitle?: string;
  tooltipBody?: string;
}

export function QuickWins({ quickWins, onScrollToIssue, subtitle, tooltipTitle, tooltipBody }: QuickWinsProps) {
  if (quickWins.length === 0) return null;

  return (
    <Tooltip.Provider delayDuration={200}>
    <section
      aria-labelledby="quick-wins-heading"
      className="rounded-md bg-slate-900 p-8 mb-12 relative overflow-hidden border border-slate-800 shadow-2xl"
    >
      <div className="absolute -right-6 -bottom-6 opacity-[0.07] pointer-events-none" aria-hidden="true">
        <Zap className="w-40 h-40 text-sky-400" fill="currentColor" aria-hidden="true" />
      </div>
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-sky-500/40 to-transparent" aria-hidden="true" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2.5 py-1 rounded-md bg-sky-500 text-[10px] font-black text-white uppercase tracking-tight shadow-lg shadow-sky-500/25">
            AI Analysis
          </span>
          <h3 id="quick-wins-heading" className="text-xl font-bold text-white">
            Recommended Quick Wins
          </h3>
          {tooltipBody && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  aria-label={tooltipTitle ?? "About quick wins"}
                  className="rounded-full p-1 text-sky-200 hover:text-white hover:bg-sky-400/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                >
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="z-50 max-w-[320px] rounded-md bg-slate-950 px-4 py-3.5 text-xs leading-relaxed text-slate-300 shadow-xl animate-in fade-in-0 zoom-in-95"
                >
                  {tooltipTitle && <p className="font-bold text-white text-[13px] mb-2">{tooltipTitle}</p>}
                  <p>{tooltipBody}</p>
                  <Tooltip.Arrow className="fill-slate-950" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </div>
        <p className="text-[13px] text-sky-300/80 mb-8 leading-relaxed">
          {subtitle ?? "High-priority issues with ready-to-use code fixes for immediate remediation."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quickWins.map((w) => {
            const badgeStyle = SEVERITY_BADGE[w.severity] ?? SEVERITY_BADGE.Minor;
            return (
              <div
                key={w.id}
                className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-md backdrop-blur-sm hover:bg-slate-800/80 hover:border-slate-600 transition-all group/qw"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded-md ${badgeStyle} text-[9px] font-bold uppercase tracking-tight`}
                  >
                    {w.severity}
                  </span>
                  <span className="text-slate-500 text-[9px] font-mono">{w.id}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1 line-clamp-2 leading-snug">
                  {w.title}
                </h4>
                {w.ruleId && (
                  <p className="text-[10px] text-slate-500 font-mono mb-4 truncate">
                    {w.ruleId}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onScrollToIssue(w.id)}
                  className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest flex items-center gap-1.5 group-hover/qw:gap-2"
                >
                  View Solution
                  <ArrowRight
                    className="w-3 h-3 transition-transform group-hover/qw:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
    </Tooltip.Provider>
  );
}
