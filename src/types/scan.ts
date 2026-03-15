import type {
  EnrichedFinding,
  SeverityTotals,
  PersonaGroup,
  DetectedStack,
  ConformanceLevel,
} from "@diegovelasquezweb/a11y-engine";

export type { EnrichedFinding as Finding, SeverityTotals, PersonaGroup, DetectedStack, ConformanceLevel };

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
    conformanceLevel?: string | null;
    bestPractices?: boolean;
    patternSummary?: { total: number; confirmed: number; potential: number } | null;
  };
}

export type ScanStatus = "idle" | "running" | "success" | "error";

export interface EngineSelection {
  axe: boolean;
  cdp: boolean;
  pa11y: boolean;
}

export const DEFAULT_ENGINES: EngineSelection = { axe: true, cdp: true, pa11y: true };

export const DEFAULT_CONFORMANCE: ConformanceLevel["id"] = "AA";

export type WaitUntilStrategy = "domcontentloaded" | "load" | "networkidle";
export type ColorScheme = "light" | "dark";

export interface ViewportPreset {
  label: string;
  width: number;
  height: number;
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { label: "Desktop", width: 1280, height: 800 },
  { label: "Laptop", width: 1440, height: 900 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Mobile", width: 375, height: 812 },
];

export interface AdvancedScanOptions {
  maxRoutes: number;
  crawlDepth: number;
  waitUntil: WaitUntilStrategy;
  timeoutMs: number;
  viewport: { width: number; height: number };
  colorScheme: ColorScheme;
}

export const DEFAULT_ADVANCED: AdvancedScanOptions = {
  maxRoutes: 1,
  crawlDepth: 1,
  waitUntil: "domcontentloaded",
  timeoutMs: 30000,
  viewport: { width: 1280, height: 800 },
  colorScheme: "light",
};
