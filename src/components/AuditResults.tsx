"use client";

import { useState, useCallback, useMemo } from "react";
import { Settings2, ScanSearch, BrainCircuit } from "lucide-react";
import type { ScanResult, Finding } from "@/types/scan";
import type { EngineKnowledge } from "@diegovelasquezweb/a11y-engine";
import { ScoreGauge } from "@/components/ScoreGauge";
import { SeverityCards } from "@/components/SeverityCards";
import { PersonaImpact } from "@/components/PersonaImpact";
import { QuickWins } from "@/components/QuickWins";
import { FindingsToolbar } from "@/components/FindingsToolbar";
import type { PageOption } from "@/components/FindingsToolbar";
import { IssueCard } from "@/components/IssueCard";
import { PatternCard } from "@/components/PatternCard";
import { ActionsPanel } from "@/components/ActionsPanel";
import { Check, FileCode } from "lucide-react";



interface AuditResultsProps {
  result: NonNullable<ScanResult["data"]>;
  scanId: string;
  knowledge?: EngineKnowledge | null;
  onRunNewTest?: () => void;
}

export function AuditResults({ result, scanId, onRunNewTest, knowledge }: AuditResultsProps) {
  const [filterValue, setFilterValue] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageFilter, setPageFilter] = useState("all");
  const [allExpanded, setAllExpanded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const concepts = knowledge?.concepts;
  const wcagPrinciples = useMemo(() => knowledge?.wcagPrinciples ?? [], [knowledge]);
  const personaDescriptions = useMemo(() => {
    const entries = knowledge?.personas ?? [];
    return Object.fromEntries(entries.map((persona) => [persona.id, persona.description]));
  }, [knowledge]);

  const pages = useMemo((): PageOption[] => {
    const counts: Record<string, number> = {};
    for (const f of result.findings) {
      if (f.area) counts[f.area] = (counts[f.area] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([path, count]) => ({ path, count }));
  }, [result.findings]);

  const hasVerificationFindings = useMemo(
    () => result.findings.some((f) => !!f.needsVerification),
    [result.findings]
  );

  const filteredFindings = useMemo((): Finding[] => {
    let findings = result.findings;

    if (pageFilter !== "all") {
      findings = findings.filter((f) => f.area === pageFilter);
    }

    if (filterValue !== "all") {
      if (filterValue === "needs-verification") {
        findings = findings.filter((f) => !!f.needsVerification);
      } else {
      const principle = wcagPrinciples.find((p) => p.name === filterValue);
      if (principle) {
        findings = findings.filter((f) => f.wcag.includes(principle.criterionPrefix));
      } else {
        findings = findings.filter((f) => f.severity === filterValue);
      }
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
  }, [result, filterValue, pageFilter, searchQuery, wcagPrinciples]);

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
    <div id="results" className="pb-16">

      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-extrabold">Web Accessibility Audit</h2>
            {result.aiEnhancedCount != null && result.aiEnhancedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-widest border border-violet-200/60 self-center">
                <BrainCircuit className="w-3 h-3" aria-hidden="true" />
                AI Enhanced
              </span>
            )}
          </div>
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
          {(result.conformanceLevel || result.bestPractices || result.repoScanned) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {result.conformanceLevel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
                  WCAG 2.2 {result.conformanceLevel}
                </span>
              )}
              {result.bestPractices && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                  Best Practices
                </span>
              )}
              {result.repoScanned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200/60" title={result.repoScanned}>
                  {result.patternSummary && result.patternSummary.total > 0
                    ? `${result.patternSummary.total} source ${result.patternSummary.total === 1 ? "pattern" : "patterns"}`
                    : "Repository scanned"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => { if (onRunNewTest) { onRunNewTest(); } else { window.location.assign("/"); } }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-colors"
          >
            <ScanSearch className="w-4 h-4" aria-hidden="true" />
            New Scan
          </button>
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Settings2 className="w-4 h-4" aria-hidden="true" />
            Actions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-12 items-stretch">
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-5 flex">
            <ScoreGauge
              score={result.score}
              label={result.scoreLabel}
              wcagStatus={result.wcagStatus}
              tooltipTitle={concepts?.score?.title}
              tooltipBody={concepts?.score?.body}
              description={concepts?.score?.context}
            />
          </div>
          <div className="md:col-span-7 flex">
            <div className="w-full">
              <SeverityCards
                totals={result.totals}
                severityLevels={knowledge?.severityLevels}
                tooltipTitle={concepts?.severityBreakdown?.title}
                tooltipBody={concepts?.severityBreakdown?.body}
              />
            </div>
          </div>
        </div>
        <div className="xl:col-span-4 flex">
          <PersonaImpact
            personaGroups={result.personaGroups}
            totalFindings={result.totalFindings}
            tooltipTitle={concepts?.personaImpact?.title}
            tooltipBody={concepts?.personaImpact?.body}
            personaDescriptions={personaDescriptions}
          />
        </div>
      </div>

      <QuickWins
        quickWins={result.quickWins}
        onScrollToIssue={handleScrollToIssue}
        tooltipTitle={concepts?.quickWins?.title}
        tooltipBody={concepts?.quickWins?.body}
        subtitle={concepts?.quickWins?.context}
      />

      <FindingsToolbar
        totalFindings={filteredFindings.length}
        hasVerificationFindings={hasVerificationFindings}
        filterValue={filterValue}
        searchQuery={searchQuery}
        allExpanded={allExpanded}
        pageFilter={pageFilter}
        pages={pages}
        knowledge={knowledge}
        onFilterChange={setFilterValue}
        onSearchChange={setSearchQuery}
        onToggleAll={() => setAllExpanded(!allExpanded)}
        onPageFilterChange={setPageFilter}
      />

      <div className="space-y-6">
        {filteredFindings.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-md border border-slate-100 border-dashed">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4 text-slate-400">
              <Check className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No matching issues</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
              No violations found for this filter
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <IssueCard
              key={finding.id}
              finding={finding}
              forceExpanded={allExpanded ? true : undefined}
            />
          ))
        )}
      </div>

      {result.patternFindings && result.patternFindings.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-violet-100 text-violet-700">
              <FileCode className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Source Code Patterns</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {result.patternFindings.filter(f => f.status === "confirmed").length} confirmed
                {" · "}
                {result.patternFindings.filter(f => f.status === "potential").length} potential
              </p>
            </div>
          </div>
          {result.patternFindings.map((finding) => (
            <PatternCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}

      <ActionsPanel
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        scanId={scanId}
        targetUrl={result.targetUrl}
        totals={result.totals}
        totalFindings={result.totalFindings}
        findings={result.findings}
        knowledge={knowledge}
      />
    </div>
  );
}
