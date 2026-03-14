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
  scanId: string;
  onRunNewTest?: () => void;
}

export function AuditResults({ result, scanId, onRunNewTest }: AuditResultsProps) {
  const [filterValue, setFilterValue] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);

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
    const offset = 160;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    el.classList.add("ring-4", "ring-sky-300");
    setTimeout(() => {
      el.classList.remove("ring-4", "ring-sky-300");
    }, 2000);
  }, []);

  return (
    <div id="results" className="pb-28">

      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold mb-1">Web Accessibility Audit</h2>
          <p className="text-sm font-medium text-sky-600 mb-1 truncate">{result.targetUrl}</p>
          <p className="text-slate-500 text-sm">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200/60">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-12 items-stretch">
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-5 flex">
            <ScoreGauge
              score={result.score}
              label={result.scoreLabel}
              wcagStatus={result.wcagStatus}
            />
          </div>
          <div className="md:col-span-7 flex">
            <div className="w-full">
              <SeverityCards totals={result.totals} />
            </div>
          </div>
        </div>
        <div className="xl:col-span-4 flex">
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
          <div className="text-center py-12 bg-slate-50 rounded-md border border-slate-100 border-dashed">
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

      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <nav
          aria-label="Scan actions"
          className="pointer-events-auto mb-5 flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-900/10"
        >
          <FooterAction
            label="New Scan"
            onClick={onRunNewTest || (() => window.location.assign("/"))}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          />

          <div className="w-px h-8 bg-slate-200 mx-1" aria-hidden="true" />

          <FooterAction
            label="Configure Jira"
            onClick={() => setJiraOpen(true)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <FooterAction
            label="Send to Jira"
            onClick={() => setJiraOpen(true)}
            variant="primary"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            }
          />

          <FooterAction
            label="Stakeholder Report"
            onClick={() => window.open(`/api/scan/${scanId}/pdf`, "_blank", "noopener,noreferrer")}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          <FooterAction
            label="Checklist"
            onClick={() => window.open(`/api/scan/${scanId}/checklist`, "_blank", "noopener,noreferrer")}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        </nav>
      </div>

      <JiraIntegration
        targetUrl={result.targetUrl}
        totals={result.totals}
        findings={result.findings}
        open={jiraOpen}
        onOpenChange={setJiraOpen}
      />
    </div>
  );
}

interface FooterActionProps {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  variant?: "default" | "primary";
}

function FooterAction({ label, onClick, icon, variant = "default" }: FooterActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all group ${
        variant === "primary"
          ? "bg-sky-600 text-white hover:bg-sky-700 shadow-md shadow-sky-600/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span className={`transition-transform group-hover:scale-110 ${variant === "primary" ? "text-white" : ""}`}>
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
