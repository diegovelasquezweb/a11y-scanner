"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import * as Tabs from "@radix-ui/react-tabs";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { Finding } from "@/types/scan";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  Critical: {
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    border: "border-rose-200 hover:border-rose-300",
  },
  Serious: {
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    border: "border-orange-200 hover:border-orange-300",
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    border: "border-amber-200 hover:border-amber-300",
  },
  Minor: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    border: "border-emerald-200 hover:border-emerald-300",
  },
};

type TabKey = "problem" | "fix" | "technical" | "visual";

interface IssueCardProps {
  finding: Finding;
  forceExpanded?: boolean;
}

export function IssueCard({ finding, forceExpanded }: IssueCardProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isExpanded = forceExpanded ?? localExpanded;

  const styles = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.Minor;

  const effortLevel = finding.effort ?? (finding.fixCode ? "low" : "high");
  const effortConfig = {
    low: { text: "Low Effort", style: "bg-emerald-50 text-emerald-700 border-emerald-200/60" },
    medium: { text: "Med Effort", style: "bg-amber-50 text-amber-700 border-amber-200/60" },
    high: { text: "High Effort", style: "bg-rose-50 text-rose-700 border-rose-200/60" },
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

  const availableTabs: { key: TabKey; label: string }[] = [
    { key: "problem", label: "The Problem" },
    { key: "fix", label: "The Fix" },
    ...(finding.evidence.length > 0
      ? [{ key: "technical" as TabKey, label: "Technical Evidence" }]
      : []),
    ...(finding.screenshotPath
      ? [{ key: "visual" as TabKey, label: "Visual Evidence" }]
      : []),
  ];

  const stackNotes = [
    ...(finding.frameworkNotes
      ? Object.entries(finding.frameworkNotes).map(([fw, note]) => ({
          key: fw,
          note,
          style: "bg-slate-100 text-slate-600 border-slate-200",
        }))
      : []),
    ...(finding.cmsNotes
      ? Object.entries(finding.cmsNotes).map(([cms, note]) => ({
          key: cms,
          note,
          style: "bg-violet-50 text-violet-700 border-violet-200",
        }))
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
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border ${effort.style} shadow-sm backdrop-blur-sm uppercase tracking-wider`}
                  >
                    {effort.text}
                  </span>
                  {finding.wcag && (
                    <span className="wcag-label px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50/80 text-sky-700 border border-sky-100/80 shadow-sm backdrop-blur-sm">
                      WCAG {finding.wcag}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {normalizeBadgeText(finding.ruleId)}
                  </span>
                  {finding.category && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200">
                      {normalizeBadgeText(finding.category, true)}
                    </span>
                  )}
                </div>
                <h3 className="searchable-field text-lg md:text-xl font-extrabold text-slate-900 leading-tight mb-3 group-hover:text-sky-900 transition-colors">
                  {finding.title}
                </h3>
                {finding.selector && (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0 bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
                      <svg
                        className="w-3.5 h-3.5 text-slate-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      <code className="text-[12px] text-slate-800 font-mono truncate min-w-0 flex-1">
                        {finding.selector}
                      </code>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm group-hover:bg-slate-50 transition-colors mt-1 shrink-0">
                <svg
                  className={`card-chevron w-5 h-5 text-slate-500 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>
        </Collapsible.Trigger>

        <Collapsible.Content className="card-body data-[state=open]:expanded">
          <div>
            <div className="p-6 md:p-8 bg-slate-50/30 border-t border-slate-100/60">
              <Tabs.Root defaultValue="problem">
                <Tabs.List
                  aria-label={`Issue detail sections for ${finding.id}`}
                  className="rounded-md border border-slate-200 bg-slate-100/70 p-2 mb-4 flex flex-wrap gap-2"
                >
                  {availableTabs.map((tab) => (
                    <Tabs.Trigger
                      key={tab.key}
                      value={tab.key}
                      className="px-3 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors text-slate-600 border border-transparent hover:bg-white/70 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:border-sky-200 data-[state=active]:shadow-sm"
                    >
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <Tabs.Content value="problem">
                  <div className="bg-white rounded-md border border-slate-200/60 shadow-sm p-5 space-y-5">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="p-1 bg-slate-100 rounded-md">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
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

                <Tabs.Content value="fix">
                  <div className="bg-linear-to-br from-sky-50 to-white border border-sky-100/80 rounded-md p-5 relative overflow-hidden shadow-sm">
                    <h4 className="text-[11px] font-black text-sky-700 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      The Fix
                    </h4>
                    <div className="relative z-10 space-y-4">
                      {finding.fixDescription ? (
                        <p className="text-sm text-sky-800 leading-relaxed">
                          {finding.fixDescription}
                        </p>
                      ) : finding.recommendedFix ? (
                        <p className="text-sm text-sky-800/80 leading-relaxed">
                          {finding.recommendedFix}
                        </p>
                      ) : null}
                      {finding.fixCode && (
                        <div className="relative group/code">
                          <pre
                            tabIndex={0}
                            className="bg-slate-900 text-emerald-300 p-3 rounded overflow-x-auto text-xs font-mono border border-slate-700 whitespace-pre-wrap"
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
                                : "bg-sky-500/50 hover:bg-sky-500"
                            }`}
                          >
                            {copiedId === `fix-${finding.id}` ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      {finding.mdn && (
                        <div className="pt-1">
                          <a
                            href={finding.mdn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            MDN Docs
                          </a>
                        </div>
                      )}
                      {finding.fixDifficultyNotes && (
                        <div className="mt-4 pt-3 border-t border-sky-100/50">
                          <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            Implementation Notes
                          </h4>
                          <p className="text-[12px] text-amber-900/80 leading-relaxed bg-amber-50/60 border border-amber-100/60 rounded p-3">
                            {finding.fixDifficultyNotes}
                          </p>
                        </div>
                      )}
                      {stackNotes.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-sky-100/50">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            Stack Notes
                          </h4>
                          <div className="space-y-2">
                            {stackNotes.map(({ key, note, style }) => (
                              <div key={key} className="flex gap-2 items-start">
                                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${style} uppercase tracking-wider mt-0.5`}>
                                  {key}
                                </span>
                                <p className="text-[12px] text-slate-600 leading-relaxed">{note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Tabs.Content>

                {finding.evidence.length > 0 && (
                  <Tabs.Content value="technical">
                    <div className="bg-slate-900 rounded-md p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" aria-hidden="true" />
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
                        Technical Evidence
                      </h4>
                      <div className="relative z-10 space-y-4">
                        {finding.evidence.map((item, idx) => (
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
                                    <code>{escapeHtml(item.html)}</code>
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
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            {item.failureSummary && (
                              <div className="mt-2 p-3 bg-rose-950/30 border-l-4 border-rose-500 text-rose-300 text-xs font-mono whitespace-pre-wrap rounded-r-lg">
                                {item.failureSummary}
                              </div>
                            )}
                          </div>
                        ))}
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
