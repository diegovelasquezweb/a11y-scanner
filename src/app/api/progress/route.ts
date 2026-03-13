import { NextRequest, NextResponse } from "next/server";
import { getRunStatus } from "@/lib/github";

export const dynamic = "force-dynamic";

// Maps GitHub step names (from scan.yml) to our UI step keys.
// GitHub step names are exact matches to the "name:" fields in the workflow.
const STEP_NAME_TO_KEY: Record<string, string> = {
  "Loading website": "page",
  "Running accessibility scans": "axe",
  "Powering up your report": "intelligence",
};

// When the main scan step completes we also mark these virtual steps as done
// so the progress bar fills up naturally.
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

  try {
    const runStatus = await getRunStatus(scanId);

    if (runStatus.status === "not_found") {
      // Workflow not picked up yet — show first step as queued/pending
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
        status = ghStep.conclusion === "success" ? "done" : "error";
      } else if (ghStep.status === "in_progress") {
        status = "running";
        currentStep = key;
      } else {
        status = "pending";
      }

      steps[key] = { status, updatedAt: new Date().toISOString() };

      // When the main scan step is done, fill the virtual steps too
      if (key === "axe" && status === "done") {
        for (const virtualKey of SCAN_STEP_IMPLIES) {
          steps[virtualKey] = { status: "done", updatedAt: new Date().toISOString() };
        }
      }
    }

    // If workflow completed successfully and intelligence step is done, mark all done
    if (runStatus.status === "completed" && runStatus.conclusion === "success") {
      for (const key of ["page", "axe", "cdp", "pa11y", "merge", "intelligence"]) {
        if (!steps[key] || steps[key].status !== "error") {
          steps[key] = { status: "done", updatedAt: new Date().toISOString() };
        }
      }
      currentStep = null;
    }

    // If workflow failed, mark current running step as error
    if (
      runStatus.status === "completed" &&
      runStatus.conclusion !== "success" &&
      runStatus.conclusion !== null
    ) {
      for (const key of Object.keys(steps)) {
        if (steps[key].status === "running" || steps[key].status === "pending") {
          steps[key] = { status: "error", updatedAt: new Date().toISOString() };
        }
      }
    }

    return NextResponse.json({ steps, currentStep, scanId });
  } catch {
    return NextResponse.json({ steps: {}, currentStep: null, scanId });
  }
}
