"use client";

import { useState, useCallback, useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import type { Finding, SeverityTotals } from "@/types/scan";

const FIXED_JIRA_BASE_URL = "https://wondersauce.atlassian.net";

const ISSUE_TYPE_MAP: Record<string, string> = {
  Task: "3",
  Bug: "1",
  Story: "7",
  Epic: "6",
  A11y: "11322",
};
const ISSUE_TYPE_OPTIONS = Object.keys(ISSUE_TYPE_MAP);

interface JiraSettings {
  pid: string;
  issueType: string;
}

export interface JiraIntegrationProps {
  targetUrl: string;
  totals: SeverityTotals;
  findings: Finding[];
  /** Controlled open state from parent */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when Send to Jira succeeds */
  onSend?: () => void;
}

const defaultSettings: JiraSettings = {
  pid: "",
  issueType: "Task",
};

function buildJiraPayload(
  targetUrl: string,
  totals: SeverityTotals,
  findings: Finding[]
): { summary: string; description: string } {
  const summary = `[A11y] ${targetUrl} - Accessibility report`;
  const totalCount = totals.Critical + totals.Serious + totals.Moderate + totals.Minor;
  const reportUrl = typeof window !== "undefined" ? window.location.href : "";

  const lines: string[] = [
    "Accessibility report generated from a11y Scanner.",
    "",
    `Target: ${targetUrl}`,
    ...(reportUrl ? [`Report: ${reportUrl}`] : []),
    `Date: ${new Date().toLocaleString()}`,
    "",
    "Severity Breakdown",
    `- Total: ${totalCount}`,
    `- Critical: ${totals.Critical}`,
    `- Serious: ${totals.Serious}`,
    `- Moderate: ${totals.Moderate}`,
    `- Minor: ${totals.Minor}`,
    "",
    "Findings",
    "--------",
  ];

  for (const f of findings) {
    lines.push(`[${f.severity}] ${f.title}`);
    lines.push(`  Rule: ${f.ruleId}`);
    lines.push(`  WCAG: ${f.wcag}`);
    lines.push(`  Selector: ${f.primarySelector}`);
    if (f.fixDescription) lines.push(`  Fix: ${f.fixDescription}`);
    lines.push("");
  }

  return { summary, description: lines.join("\n") };
}

export function JiraIntegration({
  targetUrl,
  totals,
  findings,
  open,
  onOpenChange,
  onSend,
}: JiraIntegrationProps) {
  const [settings, setSettings] = useState<JiraSettings>(defaultSettings);
  const [feedback, setFeedback] = useState("");

  const pidFieldId = useId();
  const issueTypeFieldId = useId();

  const handleSendToJira = useCallback(async () => {
    const next: JiraSettings = {
      pid: settings.pid.trim(),
      issueType: settings.issueType.trim() || "Task",
    };

    if (!next.pid) {
      setFeedback("Project ID is required.");
      return;
    }

    setSettings(next);

    const { summary, description } = buildJiraPayload(targetUrl, totals, findings);
    const issueTypeId = ISSUE_TYPE_MAP[next.issueType] || ISSUE_TYPE_MAP.Task;

    try {
      await navigator.clipboard.writeText(`${summary}\n\n${description}`);
    } catch {
      // non-critical
    }

    const jiraUrl = `${FIXED_JIRA_BASE_URL}/secure/CreateIssueDetails!init.jspa?pid=${encodeURIComponent(next.pid)}&issuetype=${encodeURIComponent(issueTypeId)}&summary=${encodeURIComponent(summary)}&description=${encodeURIComponent(description)}`;
    window.open(jiraUrl, "_blank", "noopener,noreferrer");
    onOpenChange(false);
    onSend?.();
  }, [settings, targetUrl, totals, findings, onOpenChange, onSend]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setFeedback(""); onOpenChange(v); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-8 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">
                Send to Jira
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1">
                Opens a prefilled Jira issue. You must be logged in to Jira in your browser.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void handleSendToJira(); }}
            className="space-y-4"
          >
            <div>
              <label htmlFor={pidFieldId} className="block text-sm font-semibold text-slate-700 mb-1.5">
                Project ID <span className="text-rose-500">*</span>
              </label>
              <input
                id={pidFieldId}
                type="text"
                required
                value={settings.pid}
                onChange={(e) => setSettings((prev) => ({ ...prev, pid: e.target.value.replace(/\D/g, "") }))}
                placeholder="16368"
                className="w-full px-4 py-3 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                &#123;JIRA_DOMAIN&#125;/rest/api/2/project/&#123;PROJECT_KEY&#125;
              </p>
            </div>

            <div>
              <label id={issueTypeFieldId} className="block text-sm font-semibold text-slate-700 mb-1.5">
                Issue Type
              </label>
              <Select.Root
                value={settings.issueType || "Task"}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, issueType: value }))}
              >
                <Select.Trigger
                  aria-labelledby={issueTypeFieldId}
                  className="inline-flex items-center justify-between gap-2 w-full px-4 py-3 border border-slate-200 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors cursor-pointer"
                >
                  <Select.Value />
                  <Select.Icon>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="z-[60] bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95"
                    position="popper"
                    sideOffset={4}
                  >
                    <Select.Viewport className="p-1.5">
                      {ISSUE_TYPE_OPTIONS.map((type) => (
                        <Select.Item
                          key={type}
                          value={type}
                          className="relative flex items-center px-3 py-2.5 text-sm font-medium text-slate-700 rounded cursor-pointer outline-none select-none data-[highlighted]:bg-sky-50 data-[highlighted]:text-sky-700 data-[state=checked]:font-bold data-[state=checked]:text-sky-700"
                        >
                          <Select.ItemText>{type}</Select.ItemText>
                          <Select.ItemIndicator className="absolute right-3">
                            <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {feedback && (
              <p className="text-xs rounded px-3 py-2 text-rose-700 bg-rose-50 border border-rose-200">
                {feedback}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!settings.pid.trim()}
                className="px-5 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Open Jira
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
