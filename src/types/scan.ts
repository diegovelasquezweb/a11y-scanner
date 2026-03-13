export interface Evidence {
  html?: string;
  failureSummary?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  sourceRuleId: string | null;
  wcagCriterionId: string | null;
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
  scanId?: string;
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

/** Conformance level options for the WCAG slider (A → AA → AAA). */
export type ConformanceLevel = "A" | "AA" | "AAA";

/**
 * Maps a conformance level to the full set of axe-core tags it requires.
 * Each higher level is cumulative — AA includes all A tags, AAA includes all AA tags.
 */
export const CONFORMANCE_TAG_MAP: Record<ConformanceLevel, string[]> = {
  A: ["wcag2a", "wcag21a", "wcag22a"],
  AA: ["wcag2a", "wcag21a", "wcag22a", "wcag2aa", "wcag21aa", "wcag22aa"],
  AAA: ["wcag2a", "wcag21a", "wcag22a", "wcag2aa", "wcag21aa", "wcag22aa", "wcag2aaa"],
};

export const CONFORMANCE_LEVELS: { id: ConformanceLevel; label: string; description: string }[] = [
  { id: "A", label: "Level A", description: "Less strict" },
  { id: "AA", label: "Level AA", description: "Standard" },
  { id: "AAA", label: "Level AAA", description: "More strict" },
];

export const DEFAULT_CONFORMANCE: ConformanceLevel = "AA";
