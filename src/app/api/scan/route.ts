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

interface AdvancedOptions {
  maxRoutes?: number;
  crawlDepth?: number;
  waitUntil?: string;
  timeoutMs?: number;
  viewport?: { width: number; height: number };
  colorScheme?: string;
}

interface ScanRequestBody {
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
  engines?: EngineSelection;
  advanced?: AdvancedOptions;
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

function normalizeAdvanced(raw?: AdvancedOptions): Required<AdvancedOptions> {
  return {
    maxRoutes: Math.min(Math.max(Math.round(raw?.maxRoutes ?? 1), 1), 50),
    crawlDepth: Math.min(Math.max(Math.round(raw?.crawlDepth ?? 2), 1), 3),
    waitUntil: ["domcontentloaded", "load", "networkidle"].includes(raw?.waitUntil ?? "")
      ? (raw!.waitUntil as string)
      : "domcontentloaded",
    timeoutMs: Math.min(Math.max(Math.round(raw?.timeoutMs ?? 30000), 5000), 120000),
    viewport: {
      width: Math.min(Math.max(Math.round(raw?.viewport?.width ?? 1280), 320), 2560),
      height: Math.min(Math.max(Math.round(raw?.viewport?.height ?? 800), 320), 2560),
    },
    colorScheme: raw?.colorScheme === "dark" ? "dark" : "light",
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ScanRequestBody;
  const { targetUrl, githubRepoUrl, axeTags, engines, advanced } = body;

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

  const normalizedAdvanced = normalizeAdvanced(advanced);
  const scanId = randomUUID();

  if (process.env.LOCAL_MODE === "true") {
    return runLocal({ scanId, targetUrl, githubRepoUrl, axeTags, engines, advanced: normalizedAdvanced });
  }

  try {
    await triggerScan({
      scanToken: scanId,
      targetUrl,
      githubRepoUrl: githubRepoUrl || undefined,
      axeTags: axeTags?.length ? axeTags : undefined,
      engines,
      advanced: normalizedAdvanced,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start scan.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, scanId });
}

const SCAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SCAN_STUCK_TIMEOUT_MS = 5 * 60 * 1000;

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
  advanced: Required<AdvancedOptions>;
}) {
  const fs = await import("node:fs");

  const { scanId, targetUrl, githubRepoUrl, axeTags, engines, advanced } = params;

  fs.mkdirSync(SCANS_DIR, { recursive: true });
  await cleanupScans().catch(() => { /* non-fatal */ });

  fs.writeFileSync(
    getScanPath(scanId, "status.json"),
    JSON.stringify({ status: "scanning", axeTags: axeTags ?? [], updatedAt: new Date().toISOString() })
  );

  (async () => {
    try {
      const { runAudit, getPDFReport, getChecklist } = await import("@diegovelasquezweb/a11y-engine");

      const payload = await runAudit({
        baseUrl: targetUrl,
        maxRoutes: advanced.maxRoutes,
        crawlDepth: advanced.crawlDepth,
        waitUntil: advanced.waitUntil,
        timeoutMs: advanced.timeoutMs,
        viewport: advanced.viewport,
        colorScheme: advanced.colorScheme,
        repoUrl: githubRepoUrl || undefined,
        githubToken: process.env.GH_TOKEN || undefined,
        skipPatterns: false,
        ai: {
          enabled: process.env.AI_ENABLED !== "false" && !!process.env.ANTHROPIC_API_KEY,
          apiKey: process.env.ANTHROPIC_API_KEY || undefined,
          githubToken: process.env.GH_TOKEN || undefined,
        },
        axeTags: axeTags?.length ? axeTags : undefined,
        engines: engines ?? undefined,
        screenshotsDir: getScreenshotsDir(scanId),
        onProgress: (step, status) => {
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
        getPDFReport(payload, { baseUrl: targetUrl }),
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
    }
  })();

  return NextResponse.json({ success: true, scanId });
}
