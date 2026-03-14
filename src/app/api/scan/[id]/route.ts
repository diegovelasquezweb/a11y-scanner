import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getRunStatus, getArtifactFile } from "@/lib/github";

export const dynamic = "force-dynamic";

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

async function loadEngine() {
  return await import("@diegovelasquezweb/a11y-engine");
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

async function buildResponse(scanId: string, rawFindings: Record<string, unknown>) {
  const { enrichFindings, computeScore, computePersonaGroups } = await loadEngine();

  const meta = rawFindings.metadata as Record<string, unknown> | undefined;
  const firstFindingUrl = String(((rawFindings.findings as Record<string, unknown>[])?.[0]?.url) ?? "");
  const targetUrl = String(meta?.target_url ?? meta?.targetUrl ?? meta?.base_url ?? firstFindingUrl);

  const normalized = normalizeFindings(scanId, rawFindings);
  const findings = enrichFindings(normalized) as ScanFinding[];

  const severityOrder: Record<string, number> = { Critical: 1, Serious: 2, Moderate: 3, Minor: 4 };
  findings.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 99;
    const sb = severityOrder[b.severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.id.localeCompare(b.id);
  });

  const totals = { Critical: 0, Serious: 0, Moderate: 0, Minor: 0 };
  for (const f of findings) {
    if (f.severity in totals) totals[f.severity as keyof typeof totals]++;
  }

  const { score, label: scoreLabel, wcagStatus } = computeScore(totals);

  const quickWins = findings
    .filter((f) => (f.severity === "Critical" || f.severity === "Serious") && f.fixCode)
    .slice(0, 3);

  const personaGroups = computePersonaGroups(findings);

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
      scoreLabel,
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
