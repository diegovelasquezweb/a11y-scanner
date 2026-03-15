import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { triggerScan } from "@/lib/github";
import { SCANS_DIR, getScanPath, getScreenshotsDir } from "@/lib/scans";

export const maxDuration = 60;

interface EngineSelection {
  axe?: boolean;
  cdp?: boolean;
  pa11y?: boolean;
}

interface ScanRequestBody {
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
  engines?: EngineSelection;
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
  const { targetUrl, githubRepoUrl, axeTags, engines } = body;

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
    return runLocal({ scanId, targetUrl, githubRepoUrl, axeTags, engines });
  }

  try {
    await triggerScan({
      scanToken: scanId,
      targetUrl,
      githubRepoUrl: githubRepoUrl || undefined,
      axeTags: axeTags?.length ? axeTags : undefined,
      engines,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start scan.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, scanId });
}

const SCAN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCAN_STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function cleanupScans() {
  const fs = await import("node:fs");

  if (!fs.existsSync(SCANS_DIR)) return;

  const now = Date.now();
  const files = fs.readdirSync(SCANS_DIR);

  const scanIds = new Set<string>();
  for (const file of files) {
    const match = file.match(/^([a-f0-9-]+)\./);
    if (match) scanIds.add(match[1]);
  }

  for (const scanId of scanIds) {
    const statusPath = getScanPath(scanId, "status.json");
    if (!fs.existsSync(statusPath)) continue;

    const stat = fs.statSync(statusPath);
    const ageMs = now - stat.mtimeMs;

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

    if (ageMs > SCAN_MAX_AGE_MS) {
      for (const file of files) {
        if (file.startsWith(`${scanId}.`)) {
          try {
            fs.rmSync(getScanPath(scanId, file.slice(scanId.length + 1)), { recursive: true, force: true });
          } catch { /* ignore */ }
        }
      }
      const screenshots = getScreenshotsDir(scanId);
      if (fs.existsSync(screenshots)) {
        try { fs.rmSync(screenshots, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  }
}

async function runLocal(params: {
  scanId: string;
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
  engines?: EngineSelection;
}) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  const { scanId, targetUrl, githubRepoUrl, axeTags, engines } = params;

  fs.mkdirSync(SCANS_DIR, { recursive: true });
  await cleanupScans().catch(() => { /* non-fatal */ });

  fs.writeFileSync(
    getScanPath(scanId, "status.json"),
    JSON.stringify({ status: "scanning", updatedAt: new Date().toISOString() })
  );

  (async () => {
    let tmpDir = "";
    try {
      let projectDir: string | undefined;
      if (githubRepoUrl) {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-scan-"));
        const cloneDir = path.join(tmpDir, "repo");
        try {
          await execAsync(`git clone --depth 1 ${githubRepoUrl} ${cloneDir}`, { timeout: 30000 });
          projectDir = cloneDir;
        } catch { /* ignore clone errors */ }
      }

      const { runAudit, getPDFReport, getChecklist } = await import("@diegovelasquezweb/a11y-engine");

      // engines option added in engine 0.6.0; cast to bypass published types
      const payload = await (runAudit as unknown as (opts: Record<string, unknown>) => Promise<Record<string, unknown>>)({
        baseUrl: targetUrl,
        maxRoutes: 1,
        skipPatterns: true,
        axeTags: axeTags?.length ? axeTags : undefined,
        engines: engines ?? undefined,
        projectDir,
        screenshotsDir: getScreenshotsDir(scanId),
        onProgress: (step: string, status: string) => {
          const progressPath = getScanPath(scanId, "progress.json");
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

      payload.metadata = payload.metadata || {};
      (payload.metadata as Record<string, unknown>).target_url = targetUrl;
      fs.writeFileSync(
        getScanPath(scanId, "findings.json"),
        JSON.stringify(payload, null, 2)
      );

      const [pdfReport, checklistReport] = await Promise.all([
        getPDFReport(payload as unknown as Parameters<typeof getPDFReport>[0], { baseUrl: targetUrl }),
        getChecklist({ baseUrl: targetUrl }),
      ]);

      fs.writeFileSync(getScanPath(scanId, "pdf"), pdfReport.buffer);
      fs.writeFileSync(getScanPath(scanId, "checklist.html"), checklistReport.html, "utf-8");

      fs.writeFileSync(
        getScanPath(scanId, "status.json"),
        JSON.stringify({ status: "completed", updatedAt: new Date().toISOString() })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      fs.writeFileSync(
        getScanPath(scanId, "status.json"),
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
