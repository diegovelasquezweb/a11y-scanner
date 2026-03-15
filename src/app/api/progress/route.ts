import { NextRequest, NextResponse } from "next/server";
import { getScanPath } from "@/lib/scans";

export const dynamic = "force-dynamic";

const STEP_NAME_TO_KEY: Record<string, string> = {
  "Loading website": "page",
  "Running accessibility scans": "axe",
  "Powering up your report": "intelligence",
};

const SCAN_STEP_IMPLIES: string[] = ["cdp", "pa11y", "merge"];
const ALL_KEYS = ["page", "axe", "cdp", "pa11y", "merge", "intelligence"] as const;

type StepStatus = "pending" | "running" | "done" | "error";

interface StepInfo {
  status: StepStatus;
  updatedAt: string;
}

function buildDefaultSteps(now: string): Record<string, StepInfo> {
  const steps: Record<string, StepInfo> = {};
  for (const key of ALL_KEYS) {
    steps[key] = { status: "pending", updatedAt: now };
  }
  return steps;
}

function sanitizeStatus(value: string): StepStatus {
  if (value === "running" || value === "done" || value === "error" || value === "pending") return value;
  return "pending";
}

function normalizeSteps(input: unknown, now: string): Record<string, StepInfo> {
  const steps = buildDefaultSteps(now);
  if (!input || typeof input !== "object") return steps;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const raw = value as { status?: string; updatedAt?: string };
    const status = sanitizeStatus(raw.status ?? "pending");
    const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : now;
    steps[key] = { status, updatedAt };
  }
  return steps;
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

  const statusPath = getScanPath(scanId, "status.json");
  const progressPath = getScanPath(scanId, "progress.json");

  const now = new Date().toISOString();

  try {
    if (fs.existsSync(progressPath)) {
      const data = JSON.parse(fs.readFileSync(progressPath, "utf-8")) as {
        steps?: unknown;
        currentStep?: string | null;
      };
      if (data.steps && Object.keys(data.steps as Record<string, unknown>).length > 0) {
        return NextResponse.json({
          steps: normalizeSteps(data.steps, now),
          currentStep: data.currentStep ?? null,
          scanId,
        });
      }
    }

    if (!fs.existsSync(statusPath)) {
      const steps = buildDefaultSteps(now);
      steps.page = { status: "running", updatedAt: now };
      return NextResponse.json({ steps, currentStep: "page", scanId });
    }

    const statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8")) as {
      status: string;
    };

    if (statusData.status === "scanning") {
      const steps = buildDefaultSteps(now);
      steps.page = { status: "running", updatedAt: now };
      return NextResponse.json({ steps, currentStep: "page", scanId });
    }

    if (statusData.status === "error") {
      const steps = buildDefaultSteps(now);
      steps.page = { status: "error", updatedAt: now };
      return NextResponse.json({ steps, currentStep: "page", scanId });
    }

    const steps = buildDefaultSteps(now);
    for (const key of ALL_KEYS) {
      steps[key] = { status: "done", updatedAt: now };
    }
    return NextResponse.json({ steps, currentStep: null, scanId });
  } catch {
    return NextResponse.json({ steps: buildDefaultSteps(now), currentStep: null, scanId });
  }
}

async function getGitHubProgress(scanId: string) {
  const { getRunStatus } = await import("@/lib/github");

  try {
    const runStatus = await getRunStatus(scanId);
    const now = new Date().toISOString();

    if (runStatus.status === "not_found") {
      const steps = buildDefaultSteps(now);
      return NextResponse.json({ steps, currentStep: "page", scanId });
    }

    const steps = buildDefaultSteps(now);
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

      steps[key] = { status, updatedAt: now };

      if (key === "axe" && status === "done") {
        for (const virtualKey of SCAN_STEP_IMPLIES) {
          steps[virtualKey] = { status: "done", updatedAt: now };
        }
      }
    }

    if (runStatus.status === "in_progress" && Object.values(steps).every((step) => step.status === "pending")) {
      steps.page = { status: "running", updatedAt: now };
      currentStep = "page";
    }

    if (runStatus.status === "completed" && runStatus.conclusion === "success") {
      for (const key of ALL_KEYS) {
        steps[key] = { status: "done", updatedAt: now };
      }
      currentStep = null;
    }

    if (runStatus.status === "completed" && runStatus.conclusion !== "success" && runStatus.conclusion !== null) {
      const activeKeys = Object.keys(steps).filter((key) => steps[key].status !== "pending");
      const errorKey = activeKeys.at(-1) ?? "page";
      steps[errorKey] = { status: "error", updatedAt: now };
    }

    return NextResponse.json({ steps, currentStep, scanId });
  } catch {
    return NextResponse.json({ steps: {}, currentStep: null, scanId });
  }
}
