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
  const engineBase = path.join(process.cwd(), "node_modules", "@diegovelasquezweb", "a11y-engine");
  const auditDir = path.join(process.cwd(), ".audit");

  fs.mkdirSync(SCANS_DIR, { recursive: true });
  fs.mkdirSync(auditDir, { recursive: true });

  // Write initial progress
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

  writeProgress("page", "running");

  // Run async so we don't block — write status file for polling
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
      const auditScript = path.join(engineBase, "scripts", "audit.mjs");

      const cmd = [
        "node", auditScript,
        "--base-url", `"${targetUrl}"`,
        "--max-routes", "1",
        "--skip-patterns",
        "--with-reports",
        "--output", path.join(auditDir, "report.html"),
        projectDirFlag,
        axeTagsFlag,
      ].filter(Boolean).join(" ");

      await execAsync(cmd, { timeout: 55000, cwd: process.cwd() });

      writeProgress("intelligence", "done");

      // Read and normalize findings
      const findingsPath = path.join(auditDir, "a11y-findings.json");
      if (!fs.existsSync(findingsPath)) throw new Error("No findings file generated.");

      const rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));

      // Inject target_url into metadata
      rawFindings.metadata = rawFindings.metadata || {};
      rawFindings.metadata.target_url = targetUrl;

      // Save raw findings for GET /api/scan/[id] to pick up
      fs.writeFileSync(
        path.join(SCANS_DIR, `${scanId}.findings.json`),
        JSON.stringify(rawFindings, null, 2)
      );

      // Copy checklist
      const checklistSrc = path.join(auditDir, "checklist.html");
      if (fs.existsSync(checklistSrc)) {
        fs.copyFileSync(checklistSrc, path.join(SCANS_DIR, `${scanId}.checklist.html`));
      }

      // Copy PDF
      const pdfSrc = path.join(auditDir, "report.pdf");
      if (fs.existsSync(pdfSrc)) {
        fs.copyFileSync(pdfSrc, path.join(SCANS_DIR, `${scanId}.pdf`));
      }

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
