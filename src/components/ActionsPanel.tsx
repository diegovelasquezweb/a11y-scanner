"use client";

import { useState } from "react";
import { ScanSearch, Upload, FileText, ClipboardCheck, FileJson, ChevronRight, Brain } from "lucide-react";
import { SidePanel } from "@/components/SidePanel";
import { ExportModal } from "@/components/ExportModal";
import { JiraIntegration } from "@/components/JiraIntegration";
import type { Finding, SeverityTotals } from "@/types/scan";

type ModalType = "pdf" | "checklist" | "json" | "remediation" | null;

interface ActionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanId: string;
  targetUrl: string;
  totals: SeverityTotals;
  findings: Finding[];
  onNewScan: () => void;
}

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant?: "default" | "primary";
}

function ActionCard({ icon, title, description, onClick, variant = "default" }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-md border text-left transition-all group ${
        variant === "primary"
          ? "bg-sky-600 border-sky-600 hover:bg-sky-700 hover:border-sky-700 text-white"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm text-slate-900"
      }`}
    >
      <div className={`shrink-0 p-2.5 rounded-md ${
        variant === "primary" ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200"
      } transition-colors`}>
        <span className={variant === "primary" ? "text-white" : "text-slate-600"}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${variant === "primary" ? "text-white" : "text-slate-900"}`}>
          {title}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${variant === "primary" ? "text-sky-100" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 ${variant === "primary" ? "text-sky-200" : "text-slate-400"}`} aria-hidden="true" />
    </button>
  );
}

export function ActionsPanel({
  open,
  onOpenChange,
  scanId,
  targetUrl,
  totals,
  findings,
  onNewScan,
}: ActionsPanelProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [jiraOpen, setJiraOpen] = useState(false);

  const jsonPreview = JSON.stringify(
    {
      version: "0.6.1",
      targetUrl,
      score: "…",
      wcagStatus: "…",
      totalFindings: findings.length,
      findings: [`…${findings.length} findings`],
    },
    null,
    2
  );

  return (
    <>
      <SidePanel open={open} onOpenChange={onOpenChange} title="Actions">
        <div className="space-y-2.5">
          <ActionCard
            variant="primary"
            icon={<ScanSearch className="w-5 h-5" aria-hidden="true" />}
            title="New Scan"
            description="Run a fresh accessibility audit on a new URL."
            onClick={() => { onOpenChange(false); onNewScan(); }}
          />

          <div className="pt-1 pb-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Export & Share</p>
          </div>

          <ActionCard
            icon={<Upload className="w-5 h-5" aria-hidden="true" />}
            title="Send to Jira"
            description="Create a prefilled Jira issue with the full findings summary."
            onClick={() => { onOpenChange(false); setJiraOpen(true); }}
          />

          <ActionCard
            icon={<FileText className="w-5 h-5" aria-hidden="true" />}
            title="Stakeholder Report"
            description="Download a formal PDF compliance report for clients, stakeholders, and auditors."
            onClick={() => setModal("pdf")}
          />

          <ActionCard
            icon={<ClipboardCheck className="w-5 h-5" aria-hidden="true" />}
            title="Manual Checklist"
            description="Download an interactive checklist of manual WCAG 2.2 AA checks."
            onClick={() => setModal("checklist")}
          />

          <ActionCard
            icon={<FileJson className="w-5 h-5" aria-hidden="true" />}
            title="Export JSON"
            description="Download a machine-readable snapshot of all findings and scores."
            onClick={() => setModal("json")}
          />

          <ActionCard
            icon={<Brain className="w-5 h-5" aria-hidden="true" />}
            title="Remediation Guide"
            description="Download a Markdown guide optimized for AI agents and developers."
            onClick={() => setModal("remediation")}
          />
        </div>
      </SidePanel>

      <ExportModal
        open={modal === "pdf"}
        onOpenChange={(v) => !v && setModal(null)}
        title="Stakeholder Report"
        description="A formal PDF accessibility compliance report."
        detail="This report is designed for clients, non-technical stakeholders, project managers, and auditors. It includes the compliance score, WCAG status, severity breakdown, and a prioritized list of findings with recommended fixes — formatted for sharing and sign-off."
        actionLabel="Download PDF"
        onAction={() => window.open(`/api/scan/${scanId}/pdf`, "_blank", "noopener,noreferrer")}
      />

      <ExportModal
        open={modal === "checklist"}
        onOpenChange={(v) => !v && setModal(null)}
        title="Manual Checklist"
        description="An interactive WCAG 2.2 AA manual testing checklist."
        detail="Automated scanners catch around 30–40% of accessibility issues. This checklist covers the remaining manual checks — keyboard navigation, screen reader behavior, focus management, motion, zoom, and cognitive accessibility. Use it alongside the automated findings for a complete audit."
        actionLabel="Download Checklist"
        onAction={() => window.open(`/api/scan/${scanId}/checklist`, "_blank", "noopener,noreferrer")}
      />

      <ExportModal
        open={modal === "json"}
        onOpenChange={(v) => !v && setModal(null)}
        title="Export JSON"
        description="Machine-readable snapshot of all findings, scores, and metadata."
        detail="Useful for integrating with CI/CD pipelines, tracking compliance over time, importing into dashboards, or diffing two audits programmatically. Includes all enriched findings with WCAG mappings, fix code, severity, and page location."
        actionLabel="Download JSON"
        onAction={() => window.open(`/api/scan/${scanId}/json`, "_blank", "noopener,noreferrer")}
        preview={
          <pre className="text-emerald-300 text-xs font-mono leading-relaxed whitespace-pre">
            {jsonPreview}
          </pre>
        }
      />

      <ExportModal
        open={modal === "remediation"}
        onOpenChange={(v) => !v && setModal(null)}
        title="Remediation Guide"
        description="A structured Markdown guide for AI agents and developers."
        detail="Contains prioritized fixes with ready-to-use code snippets, framework-specific guardrails, WCAG mappings, selector context, and verification commands. Designed to be fed directly into an AI coding agent (Claude, Copilot, Cursor) or used by developers for systematic remediation."
        actionLabel="Download Guide"
        onAction={() => window.open(`/api/scan/${scanId}/remediation`, "_blank", "noopener,noreferrer")}
      />

      <JiraIntegration
        targetUrl={targetUrl}
        totals={totals}
        findings={findings}
        open={jiraOpen}
        onOpenChange={setJiraOpen}
      />
    </>
  );
}
