"use client";

import { useState, useCallback } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Copy, Check, FileCode } from "lucide-react";
import type { PatternFinding } from "@/types/scan";
import { getSeverityStyle } from "@/lib/severity";

interface PatternCardProps {
  finding: PatternFinding;
}

export function PatternCard({ finding }: PatternCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const styles = getSeverityStyle(finding.severity);

  const copyContext = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finding.context);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [finding.context]);

  const highlightedContext = finding.context
    .split("\n")
    .map((line) => {
      const lineNum = parseInt(line.split(/\s+/)[0], 10);
      const isMatch = lineNum === finding.line;
      return { text: line, isMatch };
    });

  return (
    <article
      id={finding.id}
      className={`bg-white/90 backdrop-blur-xl rounded-md border ${styles.border} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 mb-4 overflow-hidden`}
    >
      <Collapsible.Root open={expanded} onOpenChange={setExpanded}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="w-full text-left p-5 md:p-6 bg-linear-to-r from-white to-slate-50/80 cursor-pointer select-none focus:outline-none focus:ring-4 focus:ring-sky-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles.badge}`}>
                    {finding.severity}
                  </span>
                  {finding.wcag_criterion && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {finding.wcag_criterion}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    finding.status === "confirmed"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    {finding.status === "confirmed" ? "Confirmed" : "Potential"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                    <FileCode className="w-3 h-3" aria-hidden="true" />
                    Source Code
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight mb-2">
                  {finding.title}
                </h3>
                <p className="text-xs font-mono text-slate-500 truncate">
                  {finding.file}:{finding.line}
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </div>
          </button>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <div className="px-5 md:px-6 pb-6 space-y-5 border-t border-slate-100">

            {/* Location */}
            <div className="pt-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Location</h4>
              <code className="text-xs font-mono text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded">
                {finding.file}:{finding.line}
              </code>
            </div>

            {/* Code context */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</h4>
                <button
                  type="button"
                  onClick={copyContext}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-900 text-slate-200 rounded-md overflow-x-auto p-4 leading-relaxed">
                {highlightedContext.map((line, i) => (
                  <div
                    key={i}
                    className={line.isMatch ? "bg-amber-500/20 -mx-4 px-4 text-amber-200" : ""}
                  >
                    {line.text}
                  </div>
                ))}
              </pre>
            </div>

            {/* Fix */}
            {finding.fix_description && (
              <div>
                <h4 className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-2">The Fix</h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-sky-50/60 border border-sky-100/60 rounded p-3">
                  {finding.fix_description}
                </p>
              </div>
            )}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </article>
  );
}
