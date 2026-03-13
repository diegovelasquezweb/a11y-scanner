export interface Evidence {
  html?: string;
  failureSummary?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  category: string | null;
  title: string;
  severity: "Critical" | "Serious" | "Moderate" | "Minor";
  wcag: string;
  wcagClassification: string | null;
  area: string;
  url: string;
  selector: string;
  primarySelector: string;
  impactedUsers: string;
  actual: string;
  primaryFailureMode: string | null;
  relationshipHint: string | null;
  failureChecks: string[];
  relatedContext: string[];
  expected: string;
  mdn: string | null;
  fixDescription: string | null;
  fixCode: string | null;
  recommendedFix: string;
  evidence: Evidence[];
  totalInstances: number | null;
  effort: "low" | "medium" | "high" | null;
  relatedRules: string[];
  fixCodeLang: string;
  screenshotPath: string | null;
  falsePositiveRisk: string | null;
  guardrails: string | null;
  fixDifficultyNotes: string | null;
  frameworkNotes: Record<string, string> | null;
  cmsNotes: Record<string, string> | null;
  fileSearchPattern: string | null;
  ownershipStatus: string;
  ownershipReason: string | null;
  primarySourceScope: string[];
  searchStrategy: string;
  managedByLibrary: string | null;
  componentHint: string | null;
  verificationCommand: string | null;
  verificationCommandFallback: string | null;
  pagesAffected: number | null;
  affectedUrls: string[] | null;
  checkData: unknown;
}

export interface SeverityTotals {
  Critical: number;
  Serious: number;
  Moderate: number;
  Minor: number;
}

export interface PersonaCounts {
  [persona: string]: number;
}

export interface PersonaGroup {
  label: string;
  count: number;
  icon: string;
}

export interface DetectedStack {
  framework: string | null;
  cms: string | null;
  uiLibraries: string[];
}

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    targetUrl: string;
    scanDate: string;
    score: number;
    scoreLabel: string;
    wcagStatus: "Pass" | "Conditional Pass" | "Fail";
    totals: SeverityTotals;
    personaGroups: Record<string, PersonaGroup>;
    findings: Finding[];
    quickWins: Finding[];
    totalFindings: number;
    detectedStack?: DetectedStack;
  };
}

export type ScanStatus = "idle" | "running" | "success" | "error";

export interface WcagLevel {
  id: string;
  label: string;
  tags: string[];
  description: string;
}

export const WCAG_LEVELS: WcagLevel[] = [
  {
    id: "wcag2a",
    label: "WCAG 2.0 A",
    tags: ["wcag2a"],
    description: "Minimum level of conformance",
  },
  {
    id: "wcag2aa",
    label: "WCAG 2.0 AA",
    tags: ["wcag2aa"],
    description: "Standard compliance target",
  },
  {
    id: "wcag21a",
    label: "WCAG 2.1 A",
    tags: ["wcag21a"],
    description: "Mobile accessibility basics",
  },
  {
    id: "wcag21aa",
    label: "WCAG 2.1 AA",
    tags: ["wcag21aa"],
    description: "Current legal standard (EU/ADA)",
  },
  {
    id: "wcag22a",
    label: "WCAG 2.2 A",
    tags: ["wcag22a"],
    description: "Latest standard (level A)",
  },
  {
    id: "wcag22aa",
    label: "WCAG 2.2 AA",
    tags: ["wcag22aa"],
    description: "Latest recommended target",
  },
  {
    id: "best-practice",
    label: "Best Practices",
    tags: ["best-practice"],
    description: "Industry best practices (beyond WCAG)",
  },
];
