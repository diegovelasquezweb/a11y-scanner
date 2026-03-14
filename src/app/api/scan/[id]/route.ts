import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getRunStatus, getArtifactFile } from "@/lib/github";

export const dynamic = "force-dynamic";

const ENGINE_BASE = path.join(process.cwd(), "node_modules", "@diegovelasquezweb", "a11y-engine");

const INTELLIGENCE_PATH = path.join(
  ENGINE_BASE,
  "assets",
  "remediation",
  "intelligence.json"
);

const PA11Y_CONFIG_PATH = path.join(
  ENGINE_BASE,
  "assets",
  "engine",
  "pa11y-config.json"
);

type ScanFinding = {
  id: string;
  ruleId: string;
  source: string;
  sourceRuleId: string | null;
  wcagCriterionId: string | null;
  category: unknown;
  title: string;
  severity: string;
  wcag: string;
  wcagClassification: unknown;
  area: string;
  url: string;
  selector: string;
  primarySelector: string;
  impactedUsers: string;
  actual: string;
  primaryFailureMode: unknown;
  relationshipHint: unknown;
  failureChecks: unknown[];
  relatedContext: unknown[];
  expected: string;
  mdn: unknown;
  fixDescription: unknown;
  fixCode: unknown;
  recommendedFix: string;
  evidence: unknown[];
  totalInstances: number | null;
  effort: unknown;
  relatedRules: unknown[];
  fixCodeLang: unknown;
  screenshotPath: string | null;
  falsePositiveRisk: unknown;
  guardrails: unknown;
  fixDifficultyNotes: unknown;
  frameworkNotes: unknown;
  cmsNotes: unknown;
  fileSearchPattern: unknown;
  ownershipStatus: unknown;
  ownershipReason: unknown;
  primarySourceScope: unknown[];
  searchStrategy: unknown;
  managedByLibrary: unknown;
  componentHint: unknown;
  verificationCommand: unknown;
  verificationCommandFallback: unknown;
  pagesAffected: number | null;
  affectedUrls: unknown;
  checkData: unknown;
};

let pa11yEquivalenceMapCache: Record<string, string> | null = null;

const PA11Y_EQUIVALENCE_FALLBACK: Record<string, string> = {
  "Principle1.Guideline1_4.1_4_3.G145": "color-contrast",
  "Principle1.Guideline1_4.1_4_3.G18": "color-contrast",
  "Principle1.Guideline1_4.1_4_3.G145.Fail": "color-contrast",
  "Principle1.Guideline1_4.1_4_3.G18.Fail": "color-contrast",
  "Principle1.Guideline1_1.1_1_1.H30": "link-name",
  "Principle4.Guideline4_1.4_1_1.F77": "duplicate-id",
  "Principle2.Guideline2_4.2_4_1.H64": "frame-title",
};

function normalizePa11yToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/^wcag2a{1,3}\./, "")
    .replace(/^pa11y-/, "")
    .replace(/[^a-z0-9]/g, "");
}

function getCheckDataCode(checkData: unknown): string | null {
  if (!checkData || typeof checkData !== "object") return null;
  const code = (checkData as { code?: unknown }).code;
  return typeof code === "string" && code.length > 0 ? code : null;
}

function getPa11yEquivalenceMap(): Record<string, string> {
  if (pa11yEquivalenceMapCache) return pa11yEquivalenceMapCache;

  try {
    const config = JSON.parse(fs.readFileSync(PA11Y_CONFIG_PATH, "utf-8")) as {
      equivalenceMap?: Record<string, string>;
    };
    pa11yEquivalenceMapCache = config.equivalenceMap || PA11Y_EQUIVALENCE_FALLBACK;
  } catch {
    pa11yEquivalenceMapCache = PA11Y_EQUIVALENCE_FALLBACK;
  }

  return pa11yEquivalenceMapCache;
}

function mapPa11yRuleToCanonical(ruleId: string, sourceRuleId: string | null, checkData: unknown): string {
  const equivalenceMap = getPa11yEquivalenceMap();
  const codeCandidates = [sourceRuleId, getCheckDataCode(checkData), ruleId]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(normalizePa11yToken);

  const patterns = Object.entries(equivalenceMap).map(([pattern, canonical]) => ({
    pattern: normalizePa11yToken(pattern),
    canonical,
  }));

  for (const code of codeCandidates) {
    for (const entry of patterns) {
      if (code.startsWith(entry.pattern)) {
        return entry.canonical;
      }
    }
  }

  return ruleId;
}

function enrichFromIntelligence(findings: ScanFinding[]): ScanFinding[] {
  try {
    const intelligence = JSON.parse(fs.readFileSync(INTELLIGENCE_PATH, "utf-8")) as {
      rules?: Record<string, { category?: string; fix?: { description?: string; code?: string }; false_positive_risk?: string; fix_difficulty_notes?: string }>;
    };
    const rules = intelligence.rules || {};

    return findings.map((finding) => {
      const canonical = mapPa11yRuleToCanonical(finding.ruleId, finding.sourceRuleId, finding.checkData);
      const normalizedFinding = {
        ...finding,
        ruleId: canonical,
        sourceRuleId: finding.sourceRuleId ?? finding.ruleId,
      };

      if (normalizedFinding.fixDescription || normalizedFinding.fixCode) return normalizedFinding;

      const info = rules[canonical];
      if (!info) return normalizedFinding;

      return {
        ...normalizedFinding,
        category: normalizedFinding.category ?? info.category ?? null,
        fixDescription: info.fix?.description ?? normalizedFinding.fixDescription,
        fixCode: info.fix?.code ?? normalizedFinding.fixCode,
        falsePositiveRisk: normalizedFinding.falsePositiveRisk ?? info.false_positive_risk ?? null,
        fixDifficultyNotes: normalizedFinding.fixDifficultyNotes ?? info.fix_difficulty_notes ?? null,
      };
    });
  } catch {
    return findings;
  }
}

function normalizeFindings(scanId: string, rawFindings: Record<string, unknown>): ScanFinding[] {
  return ((rawFindings.findings as Record<string, unknown>[]) || []).map(
    (item, index) => ({
      id: String(item.id ?? `A11Y-${String(index + 1).padStart(3, "0")}`),
      ruleId: String(item.rule_id ?? ""),
      source: item.source ? String(item.source) : "axe",
      sourceRuleId: item.source_rule_id ? String(item.source_rule_id) : null,
      wcagCriterionId: item.wcag_criterion_id ? String(item.wcag_criterion_id) : null,
      category: item.category ?? null,
      title: String(item.title ?? "Untitled finding"),
      severity: String(item.severity ?? "Unknown"),
      wcag: String(item.wcag ?? ""),
      wcagClassification: item.wcag_classification ?? null,
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      primarySelector: String(item.primary_selector ?? item.selector ?? ""),
      impactedUsers: String(item.impacted_users ?? ""),
      actual: String(item.actual ?? ""),
      primaryFailureMode: item.primary_failure_mode ?? null,
      relationshipHint: item.relationship_hint ?? null,
      failureChecks: Array.isArray(item.failure_checks) ? item.failure_checks : [],
      relatedContext: Array.isArray(item.related_context) ? item.related_context : [],
      expected: String(item.expected ?? ""),
      mdn: item.mdn ?? null,
      fixDescription: item.fix_description ?? null,
      fixCode: item.fix_code ?? null,
      recommendedFix: String(item.recommended_fix ?? ""),
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      totalInstances: typeof item.total_instances === "number" ? item.total_instances : null,
      effort: item.effort ?? null,
      relatedRules: Array.isArray(item.related_rules) ? item.related_rules : [],
      fixCodeLang: item.fix_code_lang ?? "html",
      screenshotPath:
        typeof item.screenshot_path === "string" && item.screenshot_path.length > 0
          ? `/api/scan/${scanId}/screenshot?path=${encodeURIComponent(item.screenshot_path)}`
          : null,
      falsePositiveRisk: item.false_positive_risk ?? null,
      guardrails: item.guardrails ?? null,
      fixDifficultyNotes: item.fix_difficulty_notes ?? null,
      frameworkNotes: item.framework_notes ?? null,
      cmsNotes: item.cms_notes ?? null,
      fileSearchPattern: item.file_search_pattern ?? null,
      ownershipStatus: item.ownership_status ?? "unknown",
      ownershipReason: item.ownership_reason ?? null,
      primarySourceScope: Array.isArray(item.primary_source_scope) ? item.primary_source_scope : [],
      searchStrategy: item.search_strategy ?? "verify_ownership_before_search",
      managedByLibrary: item.managed_by_library ?? null,
      componentHint: item.component_hint ?? null,
      verificationCommand: item.verification_command ?? null,
      verificationCommandFallback: item.verification_command_fallback ?? null,
      pagesAffected: typeof item.pages_affected === "number" ? item.pages_affected : null,
      affectedUrls: Array.isArray(item.affected_urls) ? item.affected_urls : null,
      checkData: item.check_data ?? null,
    })
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId) {
    return NextResponse.json({ success: false, error: "Invalid scan ID." }, { status: 400 });
  }

  // LOCAL MODE — read from filesystem
  if (process.env.LOCAL_MODE === "true") {
    const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");
    const statusPath = path.join(SCANS_DIR, `${scanId}.status.json`);

    if (!fs.existsSync(statusPath)) {
      return NextResponse.json({ success: false, error: "Scan not found." }, { status: 404 });
    }

    const statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8"));

    if (statusData.status === "scanning") {
      return NextResponse.json({ success: true, status: "scanning", data: null });
    }

    if (statusData.status === "error") {
      return NextResponse.json({ success: false, status: "error", error: statusData.error || "Scan failed." });
    }

    const findingsPath = path.join(SCANS_DIR, `${scanId}.findings.json`);
    if (!fs.existsSync(findingsPath)) {
      return NextResponse.json({ success: false, error: "Scan result not found." }, { status: 404 });
    }

    const rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));
    return buildResponse(scanId, rawFindings);
  }

  // PRODUCTION MODE — GitHub Actions
  const runStatus = await getRunStatus(scanId);

  if (runStatus.status === "not_found") {
    return NextResponse.json({ success: false, error: "Scan not found." }, { status: 404 });
  }

  if (runStatus.status === "queued" || runStatus.status === "in_progress") {
    return NextResponse.json({ success: true, status: "scanning", data: null });
  }

  if (runStatus.status === "completed" && runStatus.conclusion !== "success") {
    return NextResponse.json({
      success: false,
      status: "error",
      error: `Scan failed (conclusion: ${runStatus.conclusion ?? "unknown"}).`,
    });
  }

  const resultBuffer = await getArtifactFile(scanId, "result.json");
  if (!resultBuffer) {
    return NextResponse.json(
      { success: false, error: "Scan artifact not found or expired." },
      { status: 404 }
    );
  }

  let rawFindings: Record<string, unknown>;
  try {
    rawFindings = JSON.parse(resultBuffer.toString("utf-8"));
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to parse scan results." },
      { status: 500 }
    );
  }

  return buildResponse(scanId, rawFindings);
}

function buildResponse(_scanId: string, rawFindings: Record<string, unknown>) {
  const meta = rawFindings.metadata as Record<string, unknown> | undefined;
  const firstFindingUrl = String(((rawFindings.findings as Record<string, unknown>[])?.[0]?.url) ?? "");
  const targetUrl = String(meta?.target_url ?? meta?.targetUrl ?? meta?.base_url ?? firstFindingUrl);

  const findings = enrichFromIntelligence(normalizeFindings(_scanId, rawFindings));

  // Sort by severity
  const severityOrder: Record<string, number> = { Critical: 1, Serious: 2, Moderate: 3, Minor: 4 };
  findings.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 99;
    const sb = severityOrder[b.severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.id.localeCompare(b.id);
  });

  // Totals
  const totals = { Critical: 0, Serious: 0, Moderate: 0, Minor: 0 };
  for (const f of findings) {
    if (f.severity in totals) totals[f.severity as keyof typeof totals]++;
  }

  // Score
  const complianceConfigPath = path.join(ENGINE_BASE, "assets", "reporting", "compliance-config.json");
  const complianceConfig = JSON.parse(fs.readFileSync(complianceConfigPath, "utf-8"));
  const officialPenalties = complianceConfig.complianceScore.penalties as Record<string, number>;
  const gradeThresholds = complianceConfig.gradeThresholds as { min: number; label: string }[];

  const rawScore =
    complianceConfig.complianceScore.baseScore -
    totals.Critical * (officialPenalties.Critical ?? 15) -
    totals.Serious * (officialPenalties.Serious ?? 5) -
    totals.Moderate * (officialPenalties.Moderate ?? 2) -
    totals.Minor * (officialPenalties.Minor ?? 0.5);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let label = "Critical";
  for (const threshold of gradeThresholds) {
    if (score >= threshold.min) { label = threshold.label; break; }
  }

  let wcagStatus: "Pass" | "Conditional Pass" | "Fail" = "Pass";
  if (totals.Critical > 0 || totals.Serious > 0) wcagStatus = "Fail";
  else if (totals.Moderate > 0 || totals.Minor > 0) wcagStatus = "Conditional Pass";

  const quickWins = findings
    .filter((f) => (f.severity === "Critical" || f.severity === "Serious") && f.fixCode)
    .slice(0, 3);

  // Persona groups
  const wcagRefPath = path.join(ENGINE_BASE, "assets", "reporting", "wcag-reference.json");
  const wcagRef = JSON.parse(fs.readFileSync(wcagRefPath, "utf-8"));
  const personaConfig = wcagRef.personaConfig as Record<string, { label: string; icon: string }>;
  const personaMapping = wcagRef.personaMapping as Record<string, { rules: string[]; keywords: string[] }>;

  const personaGroups: Record<string, { label: string; count: number; icon: string }> = {};
  for (const [key, config] of Object.entries(personaConfig)) {
    personaGroups[key] = { label: config.label, count: 0, icon: key };
  }

  const wcagCriterionMap = wcagRef.wcagCriterionMap as Record<string, string>;
  const criterionToPersonas: Record<string, Set<string>> = {};
  for (const [personaKey, mapping] of Object.entries(personaMapping)) {
    for (const rule of mapping.rules) {
      const criterion = wcagCriterionMap[rule];
      if (criterion) {
        if (!criterionToPersonas[criterion]) criterionToPersonas[criterion] = new Set();
        criterionToPersonas[criterion].add(personaKey);
      }
    }
  }

  for (const f of findings) {
    const ruleId = (f.ruleId || "").toLowerCase();
    const wcagCriterionId = f.wcagCriterionId || "";
    const users = (f.impactedUsers || "").toLowerCase();
    const matchedPersonas = new Set<string>();

    for (const [personaKey, mapping] of Object.entries(personaMapping)) {
      if (!personaGroups[personaKey]) continue;
      const matchesRule = mapping.rules.some((r: string) => ruleId === r.toLowerCase());
      if (matchesRule) { matchedPersonas.add(personaKey); personaGroups[personaKey].count++; continue; }
      if (wcagCriterionId && criterionToPersonas[wcagCriterionId]?.has(personaKey)) {
        matchedPersonas.add(personaKey); personaGroups[personaKey].count++; continue;
      }
    }

    if (matchedPersonas.size === 0 && users) {
      for (const [personaKey, mapping] of Object.entries(personaMapping)) {
        if (!personaGroups[personaKey] || matchedPersonas.has(personaKey)) continue;
        const matchesKeyword = mapping.keywords.some((kw: string) => users.includes(kw.toLowerCase()));
        if (matchesKeyword) personaGroups[personaKey].count++;
      }
    }
  }

  const projectContext = (rawFindings.metadata as Record<string, unknown>)?.projectContext ?? {};
  const ctx = projectContext as Record<string, unknown>;
  const detectedStack = {
    framework: ctx.framework ?? null,
    cms: ctx.cms ?? null,
    uiLibraries: (ctx.uiLibraries as unknown[]) ?? [],
  };

  return NextResponse.json({
    success: true,
    status: "completed",
    data: {
      targetUrl,
      scanDate: new Date().toISOString(),
      score,
      scoreLabel: label,
      wcagStatus,
      totals,
      personaGroups,
      findings,
      quickWins,
      totalFindings: findings.length,
      sourcePatternFindings: [],
      detectedStack,
    },
  });
}
