"use client";

import type { Finding } from "@/types/scan";

interface QuickWinsProps {
  quickWins: Finding[];
  onScrollToIssue: (id: string) => void;
}

export function QuickWins({ quickWins, onScrollToIssue }: QuickWinsProps) {
  if (quickWins.length === 0) return null;

  return (
    <div className="premium-card rounded-2xl bg-slate-900 p-6 mb-12 relative overflow-hidden">
      <div className="absolute -right-4 -bottom-4 opacity-10" aria-hidden="true">
        <svg className="w-32 h-32 text-primary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-0.5 rounded bg-primary text-[10px] font-black text-white uppercase tracking-tighter">
            AI Analysis
          </span>
          <h3 className="text-xl font-bold text-white">Recommended Quick Wins</h3>
        </div>
        <p className="text-xs text-primary/80 mb-6 -mt-2 leading-relaxed italic">
          High-priority issues with ready-to-use code fixes for immediate remediation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickWins.map((w) => (
            <div
              key={w.id}
              className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-tight line-clamp-1">
                  {w.severity}
                </span>
                <span className="text-slate-300 text-[9px] font-mono">{w.id}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-200 mb-1 line-clamp-1">{w.title}</h4>
              <p className="text-[10px] text-slate-300 font-mono mb-3 truncate">
                Page: {w.area}
              </p>
              <button
                type="button"
                onClick={() => onScrollToIssue(w.id)}
                className="text-[10px] font-bold text-blue-300 hover:text-blue-200 transition-colors uppercase tracking-widest flex items-center gap-1"
              >
                View Solution
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
