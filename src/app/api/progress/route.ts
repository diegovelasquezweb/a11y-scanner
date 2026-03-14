import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STEP_NAME_TO_KEY: Record<string, string> = {
  "Loading website": "page",
  "Running accessibility scans": "axe",
  "Powering up your report": "intelligence",
};

const SCAN_STEP_IMPLIES: string[] = ["cdp", "pa11y", "merge"];

type StepStatus = "pending" | "running" | "done" | "error";

interface StepInfo {
  status: StepStatus;
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("scanId");

  if (!scanId) {
    return NextResponse.json({ steps: {}, currentStep: null });
  }

  if (process.env.LOCAL_MODE === "true") {
    return getLocalProgress(scanId);
  }

  return getGitHubProgress(scanId);
}

async function getLocalProgress(scanId: string) {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");
  const statusPath = path.join(SCANS_DIR, `${scanId}.status.json`);

  const now = new Date().toISOString();
  const ALL_KEYS = ["page", "axe", "cdp", "pa11y", "merge", "intelligence"] as const;

  try {
    if (!fs.existsSync(statusPath)) {
      // Scan just started, not written yet
      return NextResponse.json({
        steps: { page: { status: "running", updatedAt: now } },
        currentStep: "page",
        scanId,
      });
    }

    const statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8")) as {
      status: string;
      error?: string;
    };

    if (statusData.status === "scanning") {
      return NextResponse.json({
        steps: { page: { status: "running", updatedAt: now } },
        currentStep: "page",
        scanId,
      });
    }

    if (statusData.status === "error") {
      return NextResponse.json({
        steps: { page: { status: "error", updatedAt: now } },
        currentStep: "page",
        scanId,
      });
    }

    // completed — mark all steps done so the frontend redirects
    const steps: Record<string, { status: string; updatedAt: string }> = {};
    for (const key of ALL_KEYS) {
      steps[key] = { status: "done", updatedAt: now };
    }
    return NextResponse.json({ steps, currentStep: null, scanId });
  } catch {
    return NextResponse.json({ steps: {}, currentStep: null, scanId });
  }
}

async function getGitHubProgress(scanId: string) {
  const { getRunStatus } = await import("@/lib/github");

  try {
    const runStatus = await getRunStatus(scanId);

    if (runStatus.status === "not_found") {
      return NextResponse.json({
        steps: { page: { status: "pending", updatedAt: new Date().toISOString() } },
        currentStep: "page",
        scanId,
      });
    }

    const steps: Record<string, StepInfo> = {};
    let currentStep: string | null = null;

    for (const ghStep of runStatus.steps) {
      const key = STEP_NAME_TO_KEY[ghStep.name];
      if (!key) continue;

      let status: StepStatus;
      if (ghStep.status === "completed") {
        if (ghStep.conclusion === "success") {
          status = "done";
        } else if (ghStep.conclusion === "skipped" || ghStep.conclusion === null) {
          continue;
        } else {
          status = "error";
        }
      } else if (ghStep.status === "in_progress") {
        status = "running";
        currentStep = key;
      } else {
        continue;
      }

      steps[key] = { status, updatedAt: new Date().toISOString() };

      if (key === "axe" && status === "done") {
        for (const virtualKey of SCAN_STEP_IMPLIES) {
          steps[virtualKey] = { status: "done", updatedAt: new Date().toISOString() };
        }
      }
    }

    if (runStatus.status === "in_progress" && Object.keys(steps).length === 0) {
      steps["page"] = { status: "running", updatedAt: new Date().toISOString() };
      currentStep = "page";
    }

    if (runStatus.status === "completed" && runStatus.conclusion === "success") {
      for (const key of ["page", "axe", "cdp", "pa11y", "merge", "intelligence"]) {
        steps[key] = { status: "done", updatedAt: new Date().toISOString() };
      }
      currentStep = null;
    }

    if (runStatus.status === "completed" && runStatus.conclusion !== "success" && runStatus.conclusion !== null) {
      let markedError = false;
      for (const key of Object.keys(steps)) {
        if (steps[key].status === "running") {
          steps[key] = { status: "error", updatedAt: new Date().toISOString() };
          markedError = true;
        }
      }
      if (!markedError) {
        const lastKey = Object.keys(steps).pop() ?? "page";
        steps[lastKey] = { status: "error", updatedAt: new Date().toISOString() };
      }
    }

    return NextResponse.json({ steps, currentStep, scanId });
  } catch {
    return NextResponse.json({ steps: {}, currentStep: null, scanId });
  }
}
