import { NextRequest, NextResponse } from "next/server";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const maxDuration = 60;

interface ScanRequestBody {
  targetUrl: string;
  githubRepoUrl?: string;
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

export async function POST(request: NextRequest) {
  let tmpDir = "";
  let cloneDir = "";

  try {
    const body = (await request.json()) as ScanRequestBody;
    const { targetUrl, githubRepoUrl } = body;

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

    // Create temp working directory for .audit output
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-scan-"));
    const auditDir = path.join(tmpDir, ".audit");
    fs.mkdirSync(auditDir, { recursive: true });

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
        // Continue without project dir (DOM-only scan)
      }
    }

    // Determine engine paths
    const engineBase = path.join(process.cwd(), "src", "engine");
    const auditScript = path.join(engineBase, "scripts", "audit.mjs");

    // Build command
    const cmd = [
      "node",
      auditScript,
      "--base-url",
      `"${targetUrl}"`,
      "--max-routes",
      "1",
      "--skip-patterns",
      projectDirFlag,
    ]
      .filter(Boolean)
      .join(" ");

    // Set env to redirect .audit output to tmpDir
    const env = {
      ...process.env,
      A11Y_AUDIT_DIR: auditDir,
      A11Y_ASSET_DIR: path.join(engineBase, "assets"),
    };

    execSync(cmd, {
      timeout: 55000,
      stdio: "pipe",
      env,
      cwd: engineBase,
    });

    // Read findings
    const findingsPath = path.join(auditDir, "a11y-findings.json");
    if (!fs.existsSync(findingsPath)) {
      return NextResponse.json(
        { success: false, error: "Scan completed but no findings file was generated." },
        { status: 500 }
      );
    }

    const rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));

    // Run source scanner if we have a cloned repo
    let sourcePatternFindings: unknown[] = [];
    if (cloneDir && fs.existsSync(cloneDir)) {
      try {
        const sourceScript = path.join(engineBase, "scripts", "engine", "source-scanner.mjs");
        const sourceCmd = `node ${sourceScript} --project-dir ${cloneDir}`;
        execSync(sourceCmd, { timeout: 30000, stdio: "pipe", env, cwd: engineBase });

        const sourceFindingsPath = path.join(auditDir, "source-findings.json");
        if (fs.existsSync(sourceFindingsPath)) {
          const sourceData = JSON.parse(fs.readFileSync(sourceFindingsPath, "utf-8"));
          sourcePatternFindings = sourceData.findings || [];
        }
      } catch (sourceError) {
        console.error("Source scanner error (non-fatal):", sourceError);
      }
    }

    // Normalize findings using the engine's logic
    // We replicate the normalization inline to avoid ESM import issues
    const findings = (rawFindings.findings || []).map(
      (item: Record<string, unknown>, index: number) => ({
        id: String(item.id ?? `A11Y-${String(index + 1).padStart(3, "0")}`),
        ruleId: String(item.rule_id ?? ""),
        category: item.category ?? null,
        title: String(item.title ?? "Untitled finding"),
        severity: String(item.severity ?? "Unknown"),
        wcag: String(item.wcag ?? ""),
        wcagClassification: item.wcag_classification ?? null,
        area: String(item.area ?? ""),
        url: String(item.url ?? ""),
        selector: String(item.selector ?? ""),
        primarySelector: String(item.primary_selector ?? item.selector ?? ""),
        impactedUsers: String(item.impacted_users ?? "Users relying on assistive technology"),
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
        screenshotPath: null,
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
    const baseScore = 100;
    const penalties = { Critical: 25, Serious: 15, Moderate: 5, Minor: 2 };
    const rawScore =
      baseScore -
      totals.Critical * penalties.Critical -
      totals.Serious * penalties.Serious -
      totals.Moderate * penalties.Moderate -
      totals.Minor * penalties.Minor;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Score label
    let label = "Critical";
    if (score >= 90) label = "Excellent";
    else if (score >= 75) label = "Good";
    else if (score >= 55) label = "Fair";
    else if (score >= 30) label = "Poor";

    // WCAG status
    let wcagStatus: "Pass" | "Conditional Pass" | "Fail" = "Pass";
    if (totals.Critical > 0 || totals.Serious > 0) wcagStatus = "Fail";
    else if (totals.Moderate > 0 || totals.Minor > 0) wcagStatus = "Conditional Pass";

    // Quick wins
    const quickWins = findings
      .filter(
        (f: { severity: string; fixCode: string | null }) =>
          (f.severity === "Critical" || f.severity === "Serious") && f.fixCode
      )
      .slice(0, 3);

    // Persona groups (simplified)
    const personaGroups: Record<string, { label: string; count: number; icon: string }> = {
      screenReader: { label: "Screen Reader Users", count: 0, icon: "sr" },
      keyboard: { label: "Keyboard Users", count: 0, icon: "kb" },
      vision: { label: "Low Vision Users", count: 0, icon: "vis" },
      cognitive: { label: "Cognitive Disabilities", count: 0, icon: "cog" },
    };

    for (const f of findings) {
      const users = ((f as { impactedUsers: string }).impactedUsers || "").toLowerCase();
      const rule = ((f as { ruleId: string }).ruleId || "").toLowerCase();
      if (users.includes("screen reader") || rule.includes("aria") || rule.includes("label"))
        personaGroups.screenReader.count++;
      if (users.includes("keyboard") || rule.includes("focus") || rule.includes("tabindex"))
        personaGroups.keyboard.count++;
      if (users.includes("vision") || rule.includes("contrast") || rule.includes("color"))
        personaGroups.vision.count++;
      if (users.includes("cognitive") || rule.includes("language") || rule.includes("heading"))
        personaGroups.cognitive.count++;
    }

    return NextResponse.json({
      success: true,
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
        sourcePatternFindings,
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    const message = error instanceof Error ? error.message : "Unknown scan error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    // Cleanup temp files
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
