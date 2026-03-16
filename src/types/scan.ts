import type {
  EnrichedFinding,
  SeverityTotals,
  PersonaGroup,
  DetectedStack,
  ConformanceLevel,
  EngineSelection,
  SourcePatternFinding,
  ViewportPreset,
} from "@diegovelasquezweb/a11y-engine";
import { DEFAULT_AI_SYSTEM_PROMPT, VIEWPORT_PRESETS } from "@diegovelasquezweb/a11y-engine";

export { DEFAULT_AI_SYSTEM_PROMPT, VIEWPORT_PRESETS };
export type { EnrichedFinding as Finding, SeverityTotals, PersonaGroup, DetectedStack, ConformanceLevel, EngineSelection, ViewportPreset };
export type { SourcePatternFinding as PatternFinding };

// Internal alias for use within this file
type PatternFinding = SourcePatternFinding;

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
    repoScanned?: string | null;
    patternFindings?: PatternFinding[] | null;
    aiEnhancedCount?: number;
  };
}

export type ScanStatus = "idle" | "running" | "success" | "error";

export const DEFAULT_ENGINES: EngineSelection = { axe: true, cdp: true, pa11y: true };

export const DEFAULT_CONFORMANCE: ConformanceLevel["id"] = "AA";

export type WaitUntilStrategy = "domcontentloaded" | "load" | "networkidle";
export type ColorScheme = "light" | "dark";

export interface AdvancedScanOptions {
  maxRoutes: number;
  crawlDepth: number;
  waitUntil: WaitUntilStrategy;
  timeoutMs: number;
  viewport: { width: number; height: number };
  colorScheme: ColorScheme;
  aiEnabled: boolean;
  aiSystemPrompt: string;
}



export const DEFAULT_ADVANCED: AdvancedScanOptions = {
  maxRoutes: 1,
  crawlDepth: 1,
  waitUntil: "domcontentloaded",
  timeoutMs: 30000,
  viewport: { width: 1280, height: 800 },
  colorScheme: "light",
  aiEnabled: true,
  aiSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
};
