import { NextRequest, NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const maxDuration = 60;

const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");

interface ScanRequestBody {
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function validateGithubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "github.com" && parsed.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function generateScanId(): string {
  return randomBytes(8).toString("hex");
}

function saveScanResult(scanId: string, data: Record<string, unknown>) {
  fs.mkdirSync(SCANS_DIR, { recursive: true });
  const filePath = path.join(SCANS_DIR, `${scanId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function saveScanStatus(scanId: string, status: "scanning" | "completed" | "error", error?: string) {
  fs.mkdirSync(SCANS_DIR, { recursive: true });
  const filePath = path.join(SCANS_DIR, `${scanId}.status.json`);
  fs.writeFileSync(filePath, JSON.stringify({ status, error: error || null, updatedAt: new Date().toISOString() }));
}

export async function POST(request: NextRequest) {
  let tmpDir = "";
  let cloneDir = "";
  const scanId = generateScanId();

  try {
    const body = (await request.json()) as ScanRequestBody;
    const { targetUrl, githubRepoUrl, axeTags } = body;

    if (!targetUrl || !validateUrl(targetUrl)) {
      return NextResponse.json(
        { success: false, error: "A valid target URL is required (https:// or http://)." },
        { status: 400 }
      );
    }

    if (githubRepoUrl && !validateGithubUrl(githubRepoUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid GitHub repository URL. Must be https://github.com/owner/repo." },
        { status: 400 }
      );
    }

    // Mark scan as in-progress
    saveScanStatus(scanId, "scanning");

    // Create temp working directory for repo clone
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-scan-"));

    // The engine writes to SKILL_ROOT/.audit (src/engine/.audit)
    const engineBase = path.join(process.cwd(), "src", "engine");
    const auditDir = path.join(engineBase, ".audit");
    // Clean previous audit data
    if (fs.existsSync(auditDir)) {
      fs.rmSync(auditDir, { recursive: true, force: true });
    }
    fs.mkdirSync(auditDir, { recursive: true });

    // Helper to write progress file for SSE polling
    const progressPath = path.join(auditDir, "progress.json");
    function writeProgress(step: string, status: string, extra: Record<string, unknown> = {}) {
      let progress: Record<string, unknown> = {};
      try {
        if (fs.existsSync(progressPath)) {
          progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
        }
      } catch { /* ignore */ }
      const steps = (progress.steps || {}) as Record<string, unknown>;
      steps[step] = { status, updatedAt: new Date().toISOString(), ...extra };
      progress.steps = steps;
      progress.currentStep = step;
      progress.scanId = scanId;
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    }

    // Initialize progress
    writeProgress("browser", "running");

    // Clone repo if provided
    let projectDirFlag = "";
    if (githubRepoUrl) {
      cloneDir = path.join(tmpDir, "repo");
      try {
        execSync(`git clone --depth 1 ${githubRepoUrl} ${cloneDir}`, {
          timeout: 30000,
          stdio: "pipe",
        });
        projectDirFlag = `--project-dir ${cloneDir}`;
      } catch (cloneError) {
        console.error("Failed to clone repo:", cloneError);
      }
    }

    const auditScript = path.join(engineBase, "scripts", "audit.mjs");

    const axeTagsFlag = axeTags && axeTags.length > 0
      ? `--axe-tags ${axeTags.join(",")}`
      : "";

    const cmd = [
      "node",
      auditScript,
      "--base-url",
      `"${targetUrl}"`,
      "--max-routes",
      "1",
      "--skip-patterns",
      projectDirFlag,
      axeTagsFlag,
    ]
      .filter(Boolean)
      .join(" ");

    execSync(cmd, {
      timeout: 55000,
      stdio: "pipe",
      cwd: engineBase,
    });

    // Mark intelligence processing step
    writeProgress("intelligence", "running");

    // Read findings
    const findingsPath = path.join(auditDir, "a11y-findings.json");
    if (!fs.existsSync(findingsPath)) {
      saveScanStatus(scanId, "error", "Scan completed but no findings file was generated.");
      return NextResponse.json(
        { success: false, scanId, error: "Scan completed but no findings file was generated." },
        { status: 500 }
      );
    }

    const rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));

    // Count intelligence enrichments
    const allFindings = rawFindings.findings || [];
    const enrichments = {
      fixCodes: 0,
      frameworkNotes: 0,
      cmsNotes: 0,
      guardrails: 0,
      relatedRules: 0,
      falsePositiveFlags: 0,
    };
    for (const f of allFindings) {
      if (f.fix_code) enrichments.fixCodes++;
      if (f.framework_notes && Object.keys(f.framework_notes).length > 0) enrichments.frameworkNotes++;
      if (f.cms_notes && Object.keys(f.cms_notes).length > 0) enrichments.cmsNotes++;
      if (f.guardrails && (f.guardrails.must?.length || f.guardrails.verify?.length)) enrichments.guardrails++;
      if (Array.isArray(f.related_rules) && f.related_rules.length > 0) enrichments.relatedRules++;
      if (f.false_positive_risk && f.false_positive_risk !== "low") enrichments.falsePositiveFlags++;
    }
    const totalEnrichments = enrichments.fixCodes + enrichments.frameworkNotes + enrichments.cmsNotes + enrichments.guardrails + enrichments.relatedRules + enrichments.falsePositiveFlags;

    writeProgress("intelligence", "done", {
      enriched: allFindings.length,
      fixCodes: enrichments.fixCodes,
      frameworkNotes: enrichments.frameworkNotes,
      guardrails: enrichments.guardrails,
      relatedRules: enrichments.relatedRules,
      totalEnrichments,
    });

    // Run source scanner if we have a cloned repo
    let sourcePatternFindings: unknown[] = [];
    if (cloneDir && fs.existsSync(cloneDir)) {
      try {
        const sourceScript = path.join(engineBase, "scripts", "engine", "source-scanner.mjs");
        const sourceCmd = `node ${sourceScript} --project-dir ${cloneDir}`;
        execSync(sourceCmd, { timeout: 30000, stdio: "pipe", cwd: engineBase });

        const sourceFindingsPath = path.join(auditDir, "source-findings.json");
        if (fs.existsSync(sourceFindingsPath)) {
          const sourceData = JSON.parse(fs.readFileSync(sourceFindingsPath, "utf-8"));
          sourcePatternFindings = sourceData.findings || [];
        }
      } catch (sourceError) {
        console.error("Source scanner error (non-fatal):", sourceError);
      }
    }

    // Normalize findings
    const findings = (rawFindings.findings || []).map(
      (item: Record<string, unknown>, index: number) => ({
        id: String(item.id ?? `A11Y-${String(index + 1).padStart(3, "0")}`),
        ruleId: String(item.rule_id ?? ""),
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
        screenshotPath: item.screenshot_path
          ? (() => {
              try {
                const filename = String(item.screenshot_path).replace(/^screenshots\//, "");
                const absPath = path.join(auditDir, "screenshots", filename);
                if (fs.existsSync(absPath)) {
                  const data = fs.readFileSync(absPath);
                  return `data:image/png;base64,${data.toString("base64")}`;
                }
              } catch { /* ignore */ }
              return null;
            })()
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

    // Sort by severity
    const severityOrder: Record<string, number> = { Critical: 1, Serious: 2, Moderate: 3, Minor: 4 };
    findings.sort((a: { severity: string; id: string }, b: { severity: string; id: string }) => {
      const sa = severityOrder[a.severity] ?? 99;
      const sb = severityOrder[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });

    // Build summary
    const totals = { Critical: 0, Serious: 0, Moderate: 0, Minor: 0 };
    for (const f of findings) {
      const sev = (f as { severity: string }).severity;
      if (sev in totals) totals[sev as keyof typeof totals] += 1;
    }

    // Compute score
    const complianceConfigPath = path.join(engineBase, "assets", "reporting", "compliance-config.json");
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
      if (score >= threshold.min) {
        label = threshold.label;
        break;
      }
    }

    let wcagStatus: "Pass" | "Conditional Pass" | "Fail" = "Pass";
    if (totals.Critical > 0 || totals.Serious > 0) wcagStatus = "Fail";
    else if (totals.Moderate > 0 || totals.Minor > 0) wcagStatus = "Conditional Pass";

    const quickWins = findings
      .filter(
        (f: { severity: string; fixCode: string | null }) =>
          (f.severity === "Critical" || f.severity === "Serious") && f.fixCode
      )
      .slice(0, 3);

    // Persona groups
    const wcagRefPath = path.join(engineBase, "assets", "reporting", "wcag-reference.json");
    const wcagRef = JSON.parse(fs.readFileSync(wcagRefPath, "utf-8"));
    const personaConfig = wcagRef.personaConfig as Record<string, { label: string; icon: string }>;
    const personaMapping = wcagRef.personaMapping as Record<string, { rules: string[]; keywords: string[] }>;

    const personaGroups: Record<string, { label: string; count: number; icon: string }> = {};
    for (const [key, config] of Object.entries(personaConfig)) {
      personaGroups[key] = { label: config.label, count: 0, icon: key };
    }

    // Build a reverse lookup: WCAG criterion → persona keys (from wcagCriterionMap + personaMapping rules)
    const criterionToPersonas: Record<string, Set<string>> = {};
    const wcagCriterionMap = wcagRef.wcagCriterionMap as Record<string, string>;
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
      const ruleId = ((f as { ruleId: string }).ruleId || "").toLowerCase();
      const wcagCriterionId = (f as { wcagCriterionId: string | null }).wcagCriterionId || "";
      const users = ((f as { impactedUsers: string }).impactedUsers || "").toLowerCase();

      // Track which personas matched via rule to avoid double-counting
      const matchedPersonas = new Set<string>();

      for (const [personaKey, mapping] of Object.entries(personaMapping)) {
        if (!personaGroups[personaKey]) continue;

        // 1. Strong match: canonical rule ID matches persona rules
        const matchesRule = mapping.rules.some((r: string) => ruleId === r.toLowerCase());
        if (matchesRule) {
          matchedPersonas.add(personaKey);
          personaGroups[personaKey].count++;
          continue;
        }

        // 2. Strong match: WCAG criterion maps to this persona
        if (wcagCriterionId && criterionToPersonas[wcagCriterionId]?.has(personaKey)) {
          matchedPersonas.add(personaKey);
          personaGroups[personaKey].count++;
          continue;
        }
      }

      // 3. Weak fallback: keyword matching ONLY for personas not already matched via rules
      // Only apply if no strong matches were found at all (prevents inflation)
      if (matchedPersonas.size === 0 && users) {
        for (const [personaKey, mapping] of Object.entries(personaMapping)) {
          if (!personaGroups[personaKey]) continue;
          if (matchedPersonas.has(personaKey)) continue;
          const matchesKeyword = mapping.keywords.some((kw: string) => users.includes(kw.toLowerCase()));
          if (matchesKeyword) {
            personaGroups[personaKey].count++;
          }
        }
      }
    }

    // Detected stack
    const projectContext = rawFindings.metadata?.projectContext || {};
    const detectedStack = {
      framework: projectContext.framework || null,
      cms: projectContext.cms || null,
      uiLibraries: projectContext.uiLibraries || [],
    };

    const resultData = {
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
      sourcePatternFindings,
      detectedStack,
    };

    // Persist result
    saveScanResult(scanId, resultData);

    // Persist raw findings snapshot (snake_case format) for PDF builder
    const rawFindingsPath = path.join(SCANS_DIR, `${scanId}.findings.json`);
    fs.writeFileSync(rawFindingsPath, JSON.stringify(rawFindings, null, 2));

    // Persist checklist.html if generated
    const checklistPath = path.join(auditDir, "checklist.html");
    if (fs.existsSync(checklistPath)) {
      const checklistDest = path.join(SCANS_DIR, `${scanId}.checklist.html`);
      fs.copyFileSync(checklistPath, checklistDest);
    }

    saveScanStatus(scanId, "completed");

    return NextResponse.json({
      success: true,
      scanId,
      data: resultData,
    });
  } catch (error) {
    console.error("Scan error:", error);
    const message = error instanceof Error ? error.message : "Unknown scan error";
    saveScanStatus(scanId, "error", message);
    return NextResponse.json({ success: false, scanId, error: message }, { status: 500 });
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  }
}
