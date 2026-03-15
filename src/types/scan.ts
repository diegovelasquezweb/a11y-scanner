import type {
  EnrichedFinding,
  SeverityTotals,
  PersonaGroup,
  DetectedStack,
} from "@diegovelasquezweb/a11y-engine";

export type { EnrichedFinding as Finding, SeverityTotals, PersonaGroup, DetectedStack };

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
    findings: EnrichedFinding[];
    quickWins: EnrichedFinding[];
    totalFindings: number;
    detectedStack?: DetectedStack;
  };
}

export type ScanStatus = "idle" | "running" | "success" | "error";

export interface EngineSelection {
  axe: boolean;
  cdp: boolean;
  pa11y: boolean;
}

export const DEFAULT_ENGINES: EngineSelection = { axe: true, cdp: true, pa11y: true };

export const ENGINE_OPTIONS: { id: keyof EngineSelection; label: string; description: string }[] = [
  { id: "axe", label: "axe-core", description: "WCAG rule engine" },
  { id: "cdp", label: "CDP", description: "Chrome DevTools checks" },
  { id: "pa11y", label: "pa11y", description: "HTML CodeSniffer" },
];

export type ConformanceLevel = "A" | "AA" | "AAA";

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
