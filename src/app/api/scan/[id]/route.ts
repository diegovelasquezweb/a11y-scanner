import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getRunStatus, getArtifactFile } from "@/lib/github";
import type { EnrichedFinding, Finding } from "@diegovelasquezweb/a11y-engine";

export const dynamic = "force-dynamic";

async function loadEngine() {
  return await import("@diegovelasquezweb/a11y-engine");
}

function normalizeFindings(scanId: string, rawFindings: Record<string, unknown>): Finding[] {
  return ((rawFindings.findings as Record<string, unknown>[]) || []).map(
    (item, index) => ({
      id: String(item.id ?? `A11Y-${String(index + 1).padStart(3, "0")}`),
      rule_id: String(item.rule_id ?? ""),
      source: item.source ? String(item.source) : "axe",
      source_rule_id: item.source_rule_id ? String(item.source_rule_id) : null,
      wcag_criterion_id: item.wcag_criterion_id ? String(item.wcag_criterion_id) : null,
      category: (item.category as string) ?? null,
      title: String(item.title ?? "Untitled finding"),
      severity: String(item.severity ?? "Unknown"),
      wcag: String(item.wcag ?? ""),
      wcag_classification: item.wcag_classification ? String(item.wcag_classification) : null,
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      primary_selector: String(item.primary_selector ?? item.selector ?? ""),
      impacted_users: String(item.impacted_users ?? ""),
      actual: String(item.actual ?? ""),
      primary_failure_mode: item.primary_failure_mode ? String(item.primary_failure_mode) : null,
      relationship_hint: item.relationship_hint ? String(item.relationship_hint) : null,
      failure_checks: Array.isArray(item.failure_checks) ? item.failure_checks : [],
      related_context: Array.isArray(item.related_context) ? item.related_context : [],
      expected: String(item.expected ?? ""),
      mdn: item.mdn ? String(item.mdn) : null,
      fix_description: item.fix_description ? String(item.fix_description) : null,
      fix_code: item.fix_code ? String(item.fix_code) : null,
      fix_code_lang: item.fix_code_lang ? String(item.fix_code_lang) : "html",
      recommended_fix: String(item.recommended_fix ?? ""),
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      total_instances: typeof item.total_instances === "number" ? item.total_instances : null,
      effort: item.effort ? String(item.effort) : null,
      related_rules: Array.isArray(item.related_rules) ? (item.related_rules as string[]) : [],
      screenshot_path:
        typeof item.screenshot_path === "string" && item.screenshot_path.length > 0
          ? `/api/scan/${scanId}/screenshot?path=${encodeURIComponent(item.screenshot_path)}`
          : null,
      false_positive_risk: item.false_positive_risk ? String(item.false_positive_risk) : null,
      guardrails: (item.guardrails as Record<string, unknown>) ?? null,
      fix_difficulty_notes: (item.fix_difficulty_notes as string | string[]) ?? null,
      framework_notes: item.framework_notes ? String(item.framework_notes) : null,
      cms_notes: item.cms_notes ? String(item.cms_notes) : null,
      file_search_pattern: item.file_search_pattern ? String(item.file_search_pattern) : null,
      ownership_status: String(item.ownership_status ?? "unknown"),
      ownership_reason: item.ownership_reason ? String(item.ownership_reason) : null,
      primary_source_scope: Array.isArray(item.primary_source_scope) ? (item.primary_source_scope as string[]) : [],
      search_strategy: String(item.search_strategy ?? "verify_ownership_before_search"),
      managed_by_library: item.managed_by_library ? String(item.managed_by_library) : null,
      component_hint: item.component_hint ? String(item.component_hint) : null,
      verification_command: item.verification_command ? String(item.verification_command) : null,
      verification_command_fallback: item.verification_command_fallback ? String(item.verification_command_fallback) : null,
      check_data: (item.check_data as Record<string, unknown>) ?? null,
      pages_affected: typeof item.pages_affected === "number" ? item.pages_affected : null,
      affected_urls: Array.isArray(item.affected_urls) ? (item.affected_urls as string[]) : null,
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
  const { getEnrichedFindings, getComplianceScore, getPersonaGroups } = await loadEngine();

  const meta = rawFindings.metadata as Record<string, unknown> | undefined;
  const firstFindingUrl = String(((rawFindings.findings as Record<string, unknown>[])?.[0]?.url) ?? "");
  const targetUrl = String(meta?.target_url ?? meta?.targetUrl ?? meta?.base_url ?? firstFindingUrl);

  const normalized = normalizeFindings(scanId, rawFindings);
  const findings: EnrichedFinding[] = getEnrichedFindings(normalized);

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

  const { score, label: scoreLabel, wcagStatus } = getComplianceScore(totals);

  const quickWins = findings
    .filter((f) => (f.severity === "Critical" || f.severity === "Serious") && f.fixCode)
    .slice(0, 3);

  const personaGroups = getPersonaGroups(findings);

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
