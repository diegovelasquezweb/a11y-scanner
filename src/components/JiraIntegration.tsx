"use client";

import { useState, useCallback, useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import type { Finding, SeverityTotals } from "@/types/scan";

const FIXED_JIRA_BASE_URL = "https://wondersauce.atlassian.net";


// Wondersauce Jira issue type IDs (from /rest/api/2/project/{key})
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

interface JiraIntegrationProps {
  targetUrl: string;
  totals: SeverityTotals;
  findings: Finding[];
  scanId: string;
  onRunNewTest: () => void;
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
    if (f.fixDescription) {
      lines.push(`  Fix: ${f.fixDescription}`);
    }
    lines.push("");
  }

  return { summary, description: lines.join("\n") };
}

export function JiraIntegration({
  targetUrl,
  totals,
  findings,
  scanId,
  onRunNewTest,
}: JiraIntegrationProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [settings, setSettings] = useState<JiraSettings>(defaultSettings);
  const [feedback, setFeedback] = useState("");

  const pidFieldId = useId();
  const issueTypeFieldId = useId();

  const isConfigured = Boolean(settings.pid.trim());

  const handleOpenDialog = useCallback(() => {
    setFeedback("");
    setIsDialogOpen(true);
  }, []);

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

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(`${summary}\n\n${description}`);
    } catch {
      // non-critical
    }

    // Same prefilled URL the Chrome extension opens
    const jiraUrl = `${FIXED_JIRA_BASE_URL}/secure/CreateIssueDetails!init.jspa?pid=${encodeURIComponent(next.pid)}&issuetype=${encodeURIComponent(issueTypeId)}&summary=${encodeURIComponent(summary)}&description=${encodeURIComponent(description)}`;
    window.open(jiraUrl, "_blank", "noopener,noreferrer");
    setIsDialogOpen(false);
  }, [settings, targetUrl, totals, findings]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-8">
        <div className="flex items-center gap-2.5 min-w-0">
          {isConfigured ? (
            <>
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-slate-700 font-medium truncate">
                Jira: <span className="font-bold text-slate-900">pid:{settings.pid}</span>
                <span className="text-slate-400 ml-1">@ wondersauce.atlassian.net</span>
              </span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-slate-500">No Jira integration configured</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleOpenDialog}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {isConfigured ? "Reconfigure Jira" : "Configure Jira"}
          </button>

          <button
            type="button"
            onClick={isConfigured ? () => void handleSendToJira() : handleOpenDialog}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Send to Jira
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(`/api/scan/${scanId}/checklist`, "_blank", "noopener,noreferrer")
            }
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Open Manual Checklist
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(`/api/scan/${scanId}/pdf`, "_blank", "noopener,noreferrer")
            }
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Download PDF Report
          </button>

          <button
            type="button"
            onClick={onRunNewTest}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Run New Test
          </button>
        </div>
      </div>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <Dialog.Title className="text-xl font-bold text-slate-900">
                  Send to Jira
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  Opens a prefilled Jira issue.
                  You must be logged in to Jira in your browser.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendToJira();
              }}
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
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, pid: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="16368"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, issueType: value }))
                  }
                >
                  <Select.Trigger
                    aria-labelledby={issueTypeFieldId}
                    className="inline-flex items-center justify-between gap-2 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
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
                      className="z-[60] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport className="p-1.5">
                        {ISSUE_TYPE_OPTIONS.map((type) => (
                          <Select.Item
                            key={type}
                            value={type}
                            className="relative flex items-center px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg cursor-pointer outline-none select-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-700 data-[state=checked]:font-bold data-[state=checked]:text-indigo-700"
                          >
                            <Select.ItemText>{type}</Select.ItemText>
                            <Select.ItemIndicator className="absolute right-3">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                <p className="text-xs rounded-lg px-3 py-2 text-rose-700 bg-rose-50 border border-rose-200">
                  {feedback}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={!settings.pid.trim()}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Open Jira
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
