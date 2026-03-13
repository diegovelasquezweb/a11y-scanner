"use client";

import { useState, useCallback, useMemo } from "react";
import type { ScanResult, Finding } from "@/types/scan";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SeverityCards } from "@/components/SeverityCards";
import { PersonaImpact } from "@/components/PersonaImpact";
import { QuickWins } from "@/components/QuickWins";
import { FindingsToolbar } from "@/components/FindingsToolbar";
import { IssueCard } from "@/components/IssueCard";
import { JiraIntegration } from "@/components/JiraIntegration";

const WCAG_PRINCIPLES: Record<string, string> = {
  Perceivable: " 1.",
  Operable: " 2.",
  Understandable: " 3.",
  Robust: " 4.",
};

interface AuditResultsProps {
  result: NonNullable<ScanResult["data"]>;
  onRunNewTest?: () => void;
}

export function AuditResults({ result, onRunNewTest }: AuditResultsProps) {
  const [filterValue, setFilterValue] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);

  const filteredFindings = useMemo((): Finding[] => {
    let findings = result.findings;

    if (filterValue !== "all") {
      const principleMatch = WCAG_PRINCIPLES[filterValue];
      if (principleMatch) {
        findings = findings.filter((f) => f.wcag.includes(principleMatch));
      } else {
        findings = findings.filter((f) => f.severity === filterValue);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      findings = findings.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.ruleId.toLowerCase().includes(q) ||
          f.area.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          f.actual.toLowerCase().includes(q)
      );
    }

    return findings;
  }, [result, filterValue, searchQuery]);

  const handleScrollToIssue = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-4", "ring-indigo-300");
    setTimeout(() => {
      el.classList.remove("ring-4", "ring-indigo-300");
    }, 2000);
  }, []);

  return (
    <div id="results">
      <JiraIntegration
        targetUrl={result.targetUrl}
        totals={result.totals}
        findings={result.findings}
        onRunNewTest={onRunNewTest || (() => window.location.assign("/"))}
      />

      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold mb-2">Web Accessibility Audit</h2>
          <p className="text-slate-500">
            {new Date(result.scanDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {result.detectedStack && (result.detectedStack.framework || result.detectedStack.cms || result.detectedStack.uiLibraries.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {result.detectedStack.framework && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
                  {result.detectedStack.framework}
                </span>
              )}
              {result.detectedStack.cms && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-bold border border-violet-200/60">
                  {result.detectedStack.cms}
                </span>
              )}
              {result.detectedStack.uiLibraries.map((lib) => (
                <span key={lib} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200/60">
                  {lib}
                </span>
              ))}
            </div>
          )}
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            result.totalFindings > 0
              ? "text-rose-700 bg-rose-50 border-rose-200"
              : "text-emerald-600 bg-emerald-50 border-emerald-200"
          }`}
        >
          {result.totalFindings > 0 ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-bold">
            {result.totalFindings > 0 ? "WCAG Violations Found" : "Audit Passed"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-12">
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5">
            <ScoreGauge
              score={result.score}
              label={result.scoreLabel}
              wcagStatus={result.wcagStatus}
            />
          </div>
          <div className="md:col-span-7">
            <SeverityCards totals={result.totals} />
          </div>
        </div>
        <div className="xl:col-span-4">
          <PersonaImpact
            personaGroups={result.personaGroups}
            totalFindings={result.totalFindings}
          />
        </div>
      </div>

      <QuickWins
        quickWins={result.quickWins}
        onScrollToIssue={handleScrollToIssue}
      />

      <FindingsToolbar
        totalFindings={filteredFindings.length}
        filterValue={filterValue}
        searchQuery={searchQuery}
        allExpanded={allExpanded}
        onFilterChange={setFilterValue}
        onSearchChange={setSearchQuery}
        onToggleAll={() => setAllExpanded(!allExpanded)}
      />

      <div className="space-y-6">
        {filteredFindings.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">No matching issues</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
              No violations found for this filter
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <IssueCard key={finding.id} finding={finding} forceExpanded={allExpanded} />
          ))
        )}
      </div>

      <footer className="mt-10 py-6 border-t border-slate-200 text-center">
        <p className="text-slate-600 text-sm font-medium">
          Powered by{" "}
          <a
            href="https://github.com/diegovelasquezweb/a11y"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 hover:text-primary font-semibold transition-colors"
          >
            a11y
          </a>
        </p>
      </footer>
    </div>
  );
}
