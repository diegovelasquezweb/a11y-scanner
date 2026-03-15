"use client";

import { useState } from "react";
import { ScanSearch, Upload, FileText, ClipboardCheck, FileJson, ChevronRight, Brain } from "lucide-react";
import { SidePanel } from "@/components/SidePanel";
import { ExportModal } from "@/components/ExportModal";
import { JiraIntegration } from "@/components/JiraIntegration";
import type { Finding, SeverityTotals } from "@/types/scan";

type ModalType = "pdf" | "checklist" | "json" | "remediation" | null;

import type { EngineKnowledge } from "@diegovelasquezweb/a11y-engine";

interface ActionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanId: string;
  targetUrl: string;
  totals: SeverityTotals;
  findings: Finding[];
  knowledge?: EngineKnowledge | null;
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
  knowledge,
  onNewScan,
}: ActionsPanelProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [jiraOpen, setJiraOpen] = useState(false);
  const outputs = knowledge?.outputs;

  const jsonPreview = JSON.stringify(
    {
      version: knowledge?.version ?? "…",
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
            title={outputs?.pdf?.title ?? "Stakeholder Report"}
            description={outputs?.pdf?.description ?? "A formal PDF accessibility compliance report."}
            onClick={() => setModal("pdf")}
          />

          <ActionCard
            icon={<ClipboardCheck className="w-5 h-5" aria-hidden="true" />}
            title={outputs?.checklist?.title ?? "Manual Checklist"}
            description={outputs?.checklist?.description ?? "An interactive WCAG 2.2 AA manual testing checklist."}
            onClick={() => setModal("checklist")}
          />

          <ActionCard
            icon={<FileJson className="w-5 h-5" aria-hidden="true" />}
            title={outputs?.json?.title ?? "JSON Export"}
            description={outputs?.json?.description ?? "Machine-readable snapshot of all findings and scores."}
            onClick={() => setModal("json")}
          />

          <ActionCard
            icon={<Brain className="w-5 h-5" aria-hidden="true" />}
            title={outputs?.remediation?.title ?? "Remediation Guide"}
            description={outputs?.remediation?.description ?? "A structured Markdown guide for AI agents and developers."}
            onClick={() => setModal("remediation")}
          />
        </div>
      </SidePanel>

      <ExportModal
        open={modal === "pdf"}
        onOpenChange={(v) => !v && setModal(null)}
        title={outputs?.pdf?.title ?? "Stakeholder Report"}
        description={outputs?.pdf?.description ?? "A formal PDF accessibility compliance report."}
        detail={outputs?.pdf?.detail ?? ""}
        actionLabel="Download PDF"
        onAction={() => window.open(`/api/scan/${scanId}/pdf`, "_blank", "noopener,noreferrer")}
      />

      <ExportModal
        open={modal === "checklist"}
        onOpenChange={(v) => !v && setModal(null)}
        title={outputs?.checklist?.title ?? "Manual Checklist"}
        description={outputs?.checklist?.description ?? "An interactive WCAG 2.2 AA manual testing checklist."}
        detail={outputs?.checklist?.detail ?? ""}
        actionLabel="Download Checklist"
        onAction={() => window.open(`/api/scan/${scanId}/checklist`, "_blank", "noopener,noreferrer")}
      />

      <ExportModal
        open={modal === "json"}
        onOpenChange={(v) => !v && setModal(null)}
        title={outputs?.json?.title ?? "JSON Export"}
        description={outputs?.json?.description ?? "Machine-readable snapshot of all findings."}
        detail={outputs?.json?.detail ?? ""}
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
        title={outputs?.remediation?.title ?? "Remediation Guide"}
        description={outputs?.remediation?.description ?? "A Markdown guide for AI agents and developers."}
        detail={outputs?.remediation?.detail ?? ""}
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
