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
  };
}

export type ScanStatus = "idle" | "running" | "success" | "error";
