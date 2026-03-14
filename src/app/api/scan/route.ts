import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { triggerScan } from "@/lib/github";

export const maxDuration = 60;

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
    return (
      parsed.hostname === "github.com" &&
      parsed.pathname.split("/").filter(Boolean).length >= 2
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
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

  const scanId = randomUUID();

  if (process.env.LOCAL_MODE === "true") {
    return runLocal({ scanId, targetUrl, githubRepoUrl, axeTags });
  }

  try {
    await triggerScan({
      scanToken: scanId,
      targetUrl,
      githubRepoUrl: githubRepoUrl || undefined,
      axeTags: axeTags?.length ? axeTags : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start scan.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, scanId });
}

async function runLocal(params: {
  scanId: string;
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
}) {
  const { exec } = await import("node:child_process");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const { promisify } = await import("node:util");

  const execAsync = promisify(exec);
  const { scanId, targetUrl, githubRepoUrl, axeTags } = params;

  const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");
  const symlinkBase = path.join(process.cwd(), "node_modules", "@diegovelasquezweb", "a11y-engine");
  const engineBase = fs.realpathSync(symlinkBase);
  const auditScriptPath = path.join(engineBase, "scripts", "audit.mjs");
  const auditDir = path.join(engineBase, ".audit");

  fs.mkdirSync(SCANS_DIR, { recursive: true });
  if (fs.existsSync(auditDir)) {
    fs.rmSync(auditDir, { recursive: true, force: true });
  }
  fs.mkdirSync(auditDir, { recursive: true });

  const progressPath = path.join(auditDir, "progress.json");
  function writeProgress(step: string, status: string) {
    let progress: Record<string, unknown> = {};
    try {
      if (fs.existsSync(progressPath)) {
        progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
      }
    } catch { /* ignore */ }
    const steps = (progress.steps || {}) as Record<string, unknown>;
    steps[step] = { status, updatedAt: new Date().toISOString() };
    progress.steps = steps;
    progress.currentStep = step;
    progress.scanId = scanId;
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  }

  writeProgress("page", "running");

  fs.writeFileSync(
    path.join(SCANS_DIR, `${scanId}.status.json`),
    JSON.stringify({ status: "scanning", updatedAt: new Date().toISOString() })
  );

  (async () => {
    let tmpDir = "";
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-scan-"));
      let projectDirFlag = "";

      if (githubRepoUrl) {
        const cloneDir = path.join(tmpDir, "repo");
        try {
          await execAsync(`git clone --depth 1 ${githubRepoUrl} ${cloneDir}`, { timeout: 30000 });
          projectDirFlag = `--project-dir ${cloneDir}`;
        } catch { /* ignore clone errors */ }
      }

      const axeTagsFlag = axeTags?.length ? `--axe-tags ${axeTags.join(",")}` : "";

      // Run scan only (no --with-reports) — reports are generated via engine API
      const cmd = [
        "node", auditScriptPath,
        "--base-url", `"${targetUrl}"`,
        "--max-routes", "1",
        "--skip-patterns",
        projectDirFlag,
        axeTagsFlag,
      ].filter(Boolean).join(" ");

      await execAsync(cmd, { timeout: 55000, cwd: engineBase });
      writeProgress("intelligence", "running");

      const findingsPath = path.join(auditDir, "a11y-findings.json");
      if (!fs.existsSync(findingsPath)) throw new Error("No findings file generated.");

      const rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));
      rawFindings.metadata = rawFindings.metadata || {};
      rawFindings.metadata.target_url = targetUrl;

      // Save findings
      fs.writeFileSync(
        path.join(SCANS_DIR, `${scanId}.findings.json`),
        JSON.stringify(rawFindings, null, 2)
      );

      // Generate reports via engine API
      const { getPDFReport, getChecklist } = await import("@diegovelasquezweb/a11y-engine");

      const [pdfReport, checklistReport] = await Promise.all([
        getPDFReport(rawFindings, { baseUrl: targetUrl }),
        getChecklist({ baseUrl: targetUrl }),
      ]);

      fs.writeFileSync(path.join(SCANS_DIR, `${scanId}.pdf`), pdfReport.buffer);
      fs.writeFileSync(path.join(SCANS_DIR, `${scanId}.checklist.html`), checklistReport.html, "utf-8");

      writeProgress("intelligence", "done");

      fs.writeFileSync(
        path.join(SCANS_DIR, `${scanId}.status.json`),
        JSON.stringify({ status: "completed", updatedAt: new Date().toISOString() })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      fs.writeFileSync(
        path.join(SCANS_DIR, `${scanId}.status.json`),
        JSON.stringify({ status: "error", error: message, updatedAt: new Date().toISOString() })
      );
    } finally {
      if (tmpDir) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  })();

  return NextResponse.json({ success: true, scanId });
}
