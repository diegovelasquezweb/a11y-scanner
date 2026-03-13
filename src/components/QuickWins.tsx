"use client";

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
}

export function QuickWins({ quickWins, onScrollToIssue }: QuickWinsProps) {
  if (quickWins.length === 0) return null;

  return (
    <section
      aria-labelledby="quick-wins-heading"
      className="rounded-2xl bg-slate-900 p-8 mb-12 relative overflow-hidden border border-slate-800 shadow-2xl"
    >
      {/* Background decoration */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.07] pointer-events-none" aria-hidden="true">
        <svg className="w-40 h-40 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" aria-hidden="true" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2.5 py-1 rounded-md bg-indigo-500 text-[10px] font-black text-white uppercase tracking-tight shadow-lg shadow-indigo-500/25">
            AI Analysis
          </span>
          <h3 id="quick-wins-heading" className="text-xl font-bold text-white">
            Recommended Quick Wins
          </h3>
        </div>
        <p className="text-[13px] text-indigo-300/80 mb-8 leading-relaxed">
          High-priority issues with ready-to-use code fixes for immediate remediation.
        </p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quickWins.map((w) => {
            const badgeStyle = SEVERITY_BADGE[w.severity] ?? SEVERITY_BADGE.Minor;
            return (
              <div
                key={w.id}
                className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-xl backdrop-blur-sm hover:bg-slate-800/80 hover:border-slate-600 transition-all group/qw"
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
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest flex items-center gap-1.5 group-hover/qw:gap-2"
                >
                  View Solution
                  <svg
                    className="w-3 h-3 transition-transform group-hover/qw:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
