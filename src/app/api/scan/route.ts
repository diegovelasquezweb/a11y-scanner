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
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");

  const execAsync = promisify(exec);
  const { scanId, targetUrl, githubRepoUrl, axeTags } = params;
  const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");

  fs.mkdirSync(SCANS_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(SCANS_DIR, `${scanId}.status.json`),
    JSON.stringify({ status: "scanning", updatedAt: new Date().toISOString() })
  );

  (async () => {
    let tmpDir = "";
    try {
      // Clone repo if provided (for project-dir intelligence)
      let projectDir: string | undefined;
      if (githubRepoUrl) {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-scan-"));
        const cloneDir = path.join(tmpDir, "repo");
        try {
          await execAsync(`git clone --depth 1 ${githubRepoUrl} ${cloneDir}`, { timeout: 30000 });
          projectDir = cloneDir;
        } catch { /* ignore clone errors */ }
      }

      // Run audit via engine API
      const { runAudit, getPDFReport, getChecklist } = await import("@diegovelasquezweb/a11y-engine");

      const screenshotsDir = path.join(SCANS_DIR, `${scanId}.screenshots`);

      const payload = await runAudit({
        baseUrl: targetUrl,
        maxRoutes: 1,
        skipPatterns: true,
        axeTags: axeTags?.length ? axeTags : undefined,
        projectDir,
        screenshotsDir,
        onProgress: (step, status) => {
          // Write progress for polling
          const progressPath = path.join(SCANS_DIR, `${scanId}.progress.json`);
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
        },
      });

      // Save findings
      payload.metadata = payload.metadata || {};
      (payload.metadata as Record<string, unknown>).target_url = targetUrl;
      fs.writeFileSync(
        path.join(SCANS_DIR, `${scanId}.findings.json`),
        JSON.stringify(payload, null, 2)
      );

      // Generate reports via engine API
      const [pdfReport, checklistReport] = await Promise.all([
        getPDFReport(payload, { baseUrl: targetUrl }),
        getChecklist({ baseUrl: targetUrl }),
      ]);

      fs.writeFileSync(path.join(SCANS_DIR, `${scanId}.pdf`), pdfReport.buffer);
      fs.writeFileSync(path.join(SCANS_DIR, `${scanId}.checklist.html`), checklistReport.html, "utf-8");

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
