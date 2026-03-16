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
// These values are duplicated here intentionally — the engine uses node:fs
// and cannot be imported in Client Components. These are pure data constants.
export const DEFAULT_AI_SYSTEM_PROMPT = `You are an expert web accessibility engineer specializing in WCAG 2.2 AA remediation.

Your task is to provide a developer-friendly AI hint for each accessibility finding — something MORE USEFUL than the generic automated fix already provided.

For each finding, provide:
1. fixDescription: A 2-3 sentence explanation that goes BEYOND the generic fix. Explain WHY this matters for real users, WHAT specifically to look for in the codebase, and HOW to verify the fix works. Be specific to the selector and actual violation data provided.
2. fixCode: A ready-to-use, production-quality code snippet in the correct syntax for the stack. Do NOT copy the existing fix code — write a BETTER, more complete example that a developer can use directly.

Rules:
- Your fixDescription must add new insight not present in currentFix — don't paraphrase it
- Your fixCode must be different and more complete than currentCode
- Use framework-specific syntax (JSX/TSX for React/Next.js, SFC for Vue, etc.)
- Reference the actual selector or element from the finding when possible
- If the violation data contains specific values (colors, ratios, labels), use them in your response
- Respond in JSON only — no markdown, no explanation outside the JSON structure`;

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { label: "Desktop", width: 1280, height: 800 },
  { label: "Laptop",  width: 1440, height: 900 },
  { label: "Tablet",  width: 768,  height: 1024 },
  { label: "Mobile",  width: 375,  height: 812 },
];
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
