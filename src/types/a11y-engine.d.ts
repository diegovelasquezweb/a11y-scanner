declare module "@diegovelasquezweb/a11y-engine" {
  export function enrichFindings(
    findings: Record<string, unknown>[]
  ): Record<string, unknown>[];

  export function computeScore(totals: {
    Critical: number;
    Serious: number;
    Moderate: number;
    Minor: number;
  }): { score: number; label: string; wcagStatus: string };

  export function computePersonaGroups(
    findings: Record<string, unknown>[]
  ): Record<string, { label: string; count: number; icon: string }>;

  export function mapPa11yRuleToCanonical(
    ruleId: string,
    sourceRuleId?: string | null,
    checkData?: unknown
  ): string;

  export function getAssets(): {
    intelligence: Record<string, unknown>;
    pa11yConfig: Record<string, unknown>;
    complianceConfig: Record<string, unknown>;
    wcagReference: Record<string, unknown>;
  };
}
