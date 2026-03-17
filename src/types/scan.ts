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

export const PM_AI_SYSTEM_PROMPT = `You are an accessibility compliance advisor for product managers and non-technical stakeholders.

Your task is to provide a business-oriented summary for each accessibility finding — something a PM can use to prioritize, communicate to stakeholders, and plan sprints.

For each finding, provide:
1. pmSummary: A single sentence describing who is affected and what they cannot do. Use plain language, no technical jargon.
2. pmImpact: 2-3 sentences on business consequences: legal/compliance risk, user segments blocked, effect on conversions/engagement/SEO. Be specific to the violation.
3. pmEffort: One of "quick-win", "medium", or "strategic" with a brief time estimate (e.g., "quick-win — under 1 hour per instance").

Rules:
- Write for a non-technical audience — no code, no selectors, no ARIA terminology
- Focus on users affected, business risk, and prioritization
- Reference the actual violation data (title, severity, affected users) to be specific
- Respond in JSON only — no markdown, no explanation outside the JSON structure`;

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { label: "Desktop", width: 1280, height: 800 },
  { label: "Laptop",  width: 1440, height: 900 },
  { label: "Tablet",  width: 768,  height: 1024 },
  { label: "Mobile",  width: 375,  height: 812 },
];
export type Finding = EnrichedFinding & { needsVerification?: boolean };
export type { SeverityTotals, PersonaGroup, DetectedStack, ConformanceLevel, EngineSelection, ViewportPreset };
export type { SourcePatternFinding as PatternFinding };

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
    findings: Finding[];
    quickWins: Finding[];
    totalFindings: number;
    detectedStack?: DetectedStack;
    conformanceLevel?: string | null;
    bestPractices?: boolean;
    patternSummary?: { total: number; confirmed: number; potential: number } | null;
    repoScanned?: string | null;
    patternFindings?: PatternFinding[] | null;
    aiEnhancedCount?: number;
    audience?: AudienceMode;
  };
}

export type ScanStatus = "idle" | "running" | "success" | "error";

export const DEFAULT_ENGINES: EngineSelection = { axe: true, cdp: true, pa11y: true };

export const DEFAULT_CONFORMANCE: ConformanceLevel["id"] = "AA";

export type WaitUntilStrategy = "domcontentloaded" | "load" | "networkidle";
export type ColorScheme = "light" | "dark";

export type AudienceMode = "dev" | "pm";

export interface AdvancedScanOptions {
  maxRoutes: number;
  crawlDepth: number;
  waitUntil: WaitUntilStrategy;
  timeoutMs: number;
  viewport: { width: number; height: number };
  colorScheme: ColorScheme;
  includeIncomplete: boolean;
  countIncompleteInScore: boolean;
  aiEnabled: boolean;
  aiSystemPrompt: string;
  audience: AudienceMode;
}



export const DEFAULT_ADVANCED: AdvancedScanOptions = {
  maxRoutes: 1,
  crawlDepth: 1,
  waitUntil: "domcontentloaded",
  timeoutMs: 30000,
  viewport: { width: 1280, height: 800 },
  colorScheme: "light",
  includeIncomplete: false,
  countIncompleteInScore: false,
  aiEnabled: true,
  aiSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  audience: "dev",
};
