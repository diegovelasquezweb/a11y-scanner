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

const SCAN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCAN_STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function cleanupScans(scansDir: string) {
  const fs = await import("node:fs");
  const path = await import("node:path");

  if (!fs.existsSync(scansDir)) return;

  const now = Date.now();
  const files = fs.readdirSync(scansDir);

  // Group files by scan ID
  const scanIds = new Set<string>();
  for (const file of files) {
    const match = file.match(/^([a-f0-9-]+)\./);
    if (match) scanIds.add(match[1]);
  }

  for (const scanId of scanIds) {
    const statusPath = path.join(scansDir, `${scanId}.status.json`);
    if (!fs.existsSync(statusPath)) continue;

    const stat = fs.statSync(statusPath);
    const ageMs = now - stat.mtimeMs;

    // Mark stuck scans as error
    if (ageMs > SCAN_STUCK_TIMEOUT_MS) {
      try {
        const status = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
        if (status.status === "scanning") {
          fs.writeFileSync(
            statusPath,
            JSON.stringify({ status: "error", error: "Scan timed out.", updatedAt: new Date().toISOString() })
          );
        }
      } catch { /* ignore */ }
    }

    // Delete expired scans (all files for that scan ID)
    if (ageMs > SCAN_MAX_AGE_MS) {
      for (const file of files) {
        if (file.startsWith(`${scanId}.`) || file.startsWith(`${scanId}/`)) {
          const filePath = path.join(scansDir, file);
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
          } catch { /* ignore */ }
        }
      }
      // Also remove screenshots directory
      const screenshotsDir = path.join(scansDir, `${scanId}.screenshots`);
      if (fs.existsSync(screenshotsDir)) {
        try { fs.rmSync(screenshotsDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  }
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

  // Cleanup expired and stuck scans
  await cleanupScans(SCANS_DIR).catch(() => { /* non-fatal */ });

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
