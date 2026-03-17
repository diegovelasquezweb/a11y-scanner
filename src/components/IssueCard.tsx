"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import * as Tabs from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Code, ChevronDown, Info, Zap, Check, Copy, BookOpen, Sparkles, BrainCircuit } from "lucide-react";
import type { Finding } from "@/types/scan";
import { getSeverityStyle } from "@/lib/severity";

type TabKey = "problem" | "fix" | "ai" | "technical" | "visual" | "impact";

interface IssueCardProps {
  finding: Finding;
  forceExpanded?: boolean;
  audience?: "dev" | "pm";
}

export function IssueCard({ finding, forceExpanded, audience = "dev" }: IssueCardProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isExpanded = forceExpanded ?? localExpanded;

  const styles = getSeverityStyle(finding.severity);

  const effortLevel = finding.effort ?? "high";
  const effortConfig = {
    low: { text: "Low Effort", dot: "bg-emerald-400", style: "bg-slate-50 text-slate-600 border-slate-200" },
    medium: { text: "Med Effort", dot: "bg-amber-400", style: "bg-slate-50 text-slate-600 border-slate-200" },
    high: { text: "High Effort", dot: "bg-rose-400", style: "bg-slate-50 text-slate-600 border-slate-200" },
  };
  const effort = effortConfig[effortLevel as keyof typeof effortConfig] ?? effortConfig.high;

  const normalizeBadgeText = (value: string, keepAcronyms = false): string =>
    String(value || "")
      .split(/[-_]/g)
      .map((part) => {
        if (!part) return "";
        if (keepAcronyms && part.toLowerCase() === "aria") return "ARIA";
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(" ");

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
    }
  }, []);

  const aiEnhanced = !!(finding as Finding & { aiEnhanced?: boolean }).aiEnhanced;

  const hasPmData = !!(finding.pmSummary || finding.pmImpact);

  const availableTabs: { key: TabKey; label: string }[] = [
    ...(audience === "pm" && hasPmData
      ? [{ key: "impact" as TabKey, label: "Business Impact" }]
      : []),
    { key: "problem", label: "The Problem" },
    { key: "fix", label: "The Fix" },
    ...(aiEnhanced
      ? [{ key: "ai" as TabKey, label: "AI Hint" }]
      : []),
    ...(finding.evidence.length > 0
      ? [{ key: "technical" as TabKey, label: "Technical Evidence" }]
      : []),
    ...(finding.screenshotPath
      ? [{ key: "visual" as TabKey, label: "Visual Evidence" }]
      : []),
  ];

  return (
    <article
      id={finding.id}
      className={`issue-card bg-white/90 backdrop-blur-xl rounded-md border ${styles.border} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 mb-8 overflow-hidden group`}
      data-severity={finding.severity}
      data-rule-id={finding.ruleId}
      data-wcag={finding.wcag}
    >
      <Collapsible.Root open={isExpanded} onOpenChange={setLocalExpanded}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="card-header w-full text-left p-5 md:p-6 bg-linear-to-r from-white to-slate-50/80 cursor-pointer select-none relative focus:outline-none focus:ring-4 focus:ring-sky-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border ${styles.badge} shadow-sm backdrop-blur-sm uppercase tracking-wider`}
                  >
                    {finding.severity}
                  </span>
                  {finding.needsVerification && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border border-amber-200 bg-amber-50 text-amber-700 uppercase tracking-wider">
                      Needs verification
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${effort.style} uppercase tracking-wider`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${effort.dot}`} aria-hidden="true" />
                    {effort.text}
                  </span>
                  {finding.wcag && (
                    <span className="wcag-label px-3 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                      WCAG {finding.wcag}
                    </span>
                  )}
                  {finding.category && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
                      {normalizeBadgeText(finding.category, true)}
                    </span>
                  )}
                  {finding.pagesAffected != null && finding.pagesAffected > 1 && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                      {finding.pagesAffected} pages
                    </span>
                  )}

                </div>
                <h3 className="searchable-field text-lg md:text-xl font-extrabold text-slate-900 leading-tight mb-3 group-hover:text-sky-900 transition-colors">
                  {finding.title}
                </h3>
                {finding.selector && (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0 bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
                      <Code className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                      <code className="text-[12px] text-slate-800 font-mono truncate min-w-0 flex-1">
                        {finding.selector}
                      </code>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm group-hover:bg-slate-50 transition-colors mt-1 shrink-0">
                <ChevronDown
                  className={`card-chevron w-5 h-5 text-slate-500 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </div>
            </div>
          </button>
        </Collapsible.Trigger>

        <Collapsible.Content className="card-body data-[state=open]:expanded">
          <div>
            <div className="p-6 md:p-8 bg-slate-50/30 border-t border-slate-100/60">
              <Tabs.Root defaultValue={audience === "pm" && hasPmData ? "impact" : "problem"}>
                <Tabs.List
                  aria-label={`Issue detail sections for ${finding.id}`}
                  className="rounded-md border border-slate-200 bg-slate-100/70 p-2 mb-4 flex flex-wrap gap-2"
                >
                  {availableTabs.map((tab) => (
                    <Tabs.Trigger
                      key={tab.key}
                      value={tab.key}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors border border-transparent hover:bg-white/70 data-[state=active]:bg-white data-[state=active]:shadow-sm ${
                        tab.key === "ai"
                          ? "text-violet-500 data-[state=active]:text-violet-700 data-[state=active]:border-violet-200"
                          : "text-slate-600 data-[state=active]:text-sky-700 data-[state=active]:border-sky-200"
                      }`}
                    >
                      {tab.key === "ai" && <Sparkles className="w-3 h-3" aria-hidden="true" />}
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <Tabs.Content value="problem">
                  <div className="bg-white rounded-md border border-slate-200/60 shadow-sm p-5 space-y-5">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="p-1 bg-slate-100 rounded-md">
                        <Info className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      </div>
                      The Problem
                    </h4>
                    <div>
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                        Actual Behavior
                      </span>
                      <p className="text-[13px] text-slate-700 leading-relaxed border-l-2 border-rose-300 pl-3">
                        {finding.actual}
                      </p>
                    </div>
                    {finding.expected && (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                          Expected Behavior
                        </span>
                        <p className="text-[13px] text-slate-700 leading-relaxed border-l-2 border-emerald-300 pl-3">
                          {finding.expected}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Impacted Users
                      </span>
                      <p className="text-[13px] text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                        {finding.impactedUsers}
                      </p>
                    </div>
                  </div>
                </Tabs.Content>

                {hasPmData && (
                  <Tabs.Content value="impact">
                    <div className="bg-white rounded-md border border-slate-200/60 shadow-sm p-5 space-y-5">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="p-1 bg-slate-100 rounded-md">
                          <Info className="w-4 h-4 text-slate-500" aria-hidden="true" />
                        </div>
                        Business Impact
                      </h4>
                      {finding.pmSummary && (
                        <div>
                          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block mb-1">
                            Summary
                          </span>
                          <p className="text-[13px] text-slate-700 leading-relaxed font-medium">
                            {finding.pmSummary}
                          </p>
                        </div>
                      )}
                      {finding.pmImpact && (
                        <div>
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                            Impact
                          </span>
                          <p className="text-[13px] text-slate-700 leading-relaxed border-l-2 border-amber-300 pl-3">
                            {finding.pmImpact}
                          </p>
                        </div>
                      )}
                      {finding.pmEffort && (
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                            Effort Estimate
                          </span>
                          <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                            finding.pmEffort === "quick-win"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : finding.pmEffort === "medium"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {finding.pmEffort === "quick-win" ? "Quick Win" : finding.pmEffort === "medium" ? "Medium Lift" : "Strategic"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Tabs.Content>
                )}

                <Tabs.Content value="fix">
                  <div className="bg-white border border-slate-200/60 rounded-md p-5 relative overflow-hidden shadow-sm">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      The Fix
                    </h4>
                    <div className="relative z-10 space-y-4">
                      {finding.fixDescription ? (
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {finding.fixDescription}
                        </p>
                      ) : finding.recommendedFix ? (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {finding.recommendedFix}
                        </p>
                      ) : null}
                      {finding.fixCode && (
                        <div className="relative group/code">
                          <pre
                            tabIndex={0}
                            className="bg-slate-900 text-slate-300 p-3 rounded overflow-x-auto text-xs font-mono border border-slate-700 whitespace-pre-wrap"
                          >
                            <code>{finding.fixCode}</code>
                          </pre>
                          <button
                            type="button"
                            aria-label="Copy code snippet"
                            title="Copy code snippet"
                            onClick={() => copyToClipboard(finding.fixCode!, `fix-${finding.id}`)}
                            className={`absolute top-2 right-2 p-1.5 rounded text-white opacity-0 group-hover/code:opacity-100 transition-all ${
                              copiedId === `fix-${finding.id}`
                                ? "bg-emerald-500"
                                : "bg-slate-500/50 hover:bg-slate-500"
                            }`}
                          >
                            {copiedId === `fix-${finding.id}` ? (
                              <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}
                      {(finding.frameworkNotes || finding.cmsNotes) && (
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/50 rounded p-2.5">
                          {finding.frameworkNotes || finding.cmsNotes}
                        </p>
                      )}
                      {finding.mdn && (
                        <div className="pt-1">
                          <a
                            href={finding.mdn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                          >
                            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                            MDN Docs
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Tabs.Content>

                {aiEnhanced && (
                  <Tabs.Content value="ai">
                    <div className="bg-white border border-slate-200/60 rounded-md p-5 shadow-sm">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-violet-400" aria-hidden="true" />
                        AI Hint
                        <span className="text-[9px] font-bold bg-violet-50 text-violet-500 border border-violet-200/60 px-1.5 py-0.5 rounded ml-1">Claude</span>
                      </h4>
                      <div className="space-y-4">
                        {(finding as Finding & { aiFixDescription?: string }).aiFixDescription && (
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {(finding as Finding & { aiFixDescription?: string }).aiFixDescription}
                          </p>
                        )}
                        {(finding as Finding & { aiFixCode?: string }).aiFixCode && (
                          <div className="relative group/aicode">
                            <pre
                              tabIndex={0}
                              className="bg-slate-900 text-slate-200 p-3 rounded overflow-x-auto text-xs font-mono border border-slate-700 whitespace-pre-wrap"
                            >
                              <code>{(finding as Finding & { aiFixCode?: string }).aiFixCode}</code>
                            </pre>
                            <button
                              type="button"
                              aria-label="Copy AI code suggestion"
                              title="Copy AI code suggestion"
                              onClick={() => copyToClipboard((finding as Finding & { aiFixCode?: string }).aiFixCode!, `ai-${finding.id}`)}
                              className={`absolute top-2 right-2 p-1.5 rounded text-white opacity-0 group-hover/aicode:opacity-100 transition-all ${
                                copiedId === `ai-${finding.id}`
                                  ? "bg-emerald-500"
                                  : "bg-slate-500/50 hover:bg-slate-500"
                              }`}
                            >
                              {copiedId === `ai-${finding.id}` ? (
                                <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Tabs.Content>
                )}

                {finding.evidence.length > 0 && (
                  <Tabs.Content value="technical">
                    <div className="bg-white border border-slate-200/60 rounded-md p-5 relative overflow-hidden shadow-sm">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Technical Evidence
                      </h4>
                      <div className="space-y-4">
                        {finding.evidence.map((rawItem, idx) => {
                          const item = rawItem as { html?: string; failureSummary?: string };
                          return (
                          <div key={idx} className="mb-4 last:mb-0">
                            {item.html && (
                              <div className="mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                  Source
                                </span>
                                <div className="relative group/evidence">
                                  <pre
                                    tabIndex={0}
                                    className="bg-slate-800 text-slate-50 p-3 rounded overflow-x-auto text-xs font-mono border border-slate-700"
                                  >
                                    <code>{item.html}</code>
                                  </pre>
                                  <button
                                    type="button"
                                    aria-label="Copy source HTML"
                                    title="Copy source HTML"
                                    onClick={() => copyToClipboard(item.html!, `ev-${finding.id}-${idx}`)}
                                    className={`absolute top-2 right-2 p-1.5 rounded text-white opacity-0 group-hover/evidence:opacity-100 transition-all ${
                                      copiedId === `ev-${finding.id}-${idx}`
                                        ? "bg-emerald-500"
                                        : "bg-slate-600/50 hover:bg-slate-600"
                                    }`}
                                  >
                                    {copiedId === `ev-${finding.id}-${idx}` ? (
                                      <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            {item.failureSummary && (
                              <div className="mt-2 p-3 bg-slate-50 border-l-4 border-slate-300 text-slate-600 text-xs font-mono whitespace-pre-wrap rounded-r-lg">
                                {item.failureSummary}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </Tabs.Content>
                )}

                {finding.screenshotPath && (
                  <Tabs.Content value="visual">
                    <div className="border border-slate-200 rounded-md p-4 bg-white shadow-sm">
                      <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Visual Evidence
                      </h4>
                      <div className="bg-slate-50/50 p-2 rounded-md border border-slate-200/60 inline-block shadow-sm">
                        <Image
                          src={finding.screenshotPath}
                          alt={`Screenshot of ${finding.title}`}
                          width={800}
                          height={600}
                          className="rounded border border-slate-200 shadow-sm max-h-90 w-auto object-contain bg-white"
                          unoptimized
                        />
                      </div>
                    </div>
                  </Tabs.Content>
                )}
              </Tabs.Root>
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </article>
  );
}
