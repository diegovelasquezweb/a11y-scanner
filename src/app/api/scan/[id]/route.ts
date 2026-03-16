import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getRunStatus, getArtifactFile } from "@/lib/github";
import { getScanPath } from "@/lib/scans";
import type { EnrichedFinding, AuditSummary, ScanPayload } from "@diegovelasquezweb/a11y-engine";

export const dynamic = "force-dynamic";

async function loadEngine() {
  return await import("@diegovelasquezweb/a11y-engine");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId) {
    return NextResponse.json({ success: false, error: "Invalid scan ID." }, { status: 400 });
  }

  if (process.env.LOCAL_MODE === "true") {
    const statusPath = getScanPath(scanId, "status.json");

    if (!fs.existsSync(statusPath)) {
      return NextResponse.json({ success: false, error: "Scan not found." }, { status: 404 });
    }

    const statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8"));

    if (statusData.status === "scanning") {
      return NextResponse.json({ success: true, status: "scanning", data: null });
    }

    if (statusData.status === "error") {
      return NextResponse.json({ success: false, status: "error", error: statusData.error || "Scan failed." });
    }

    const findingsPath = getScanPath(scanId, "findings.json");
    if (!fs.existsSync(findingsPath)) {
      return NextResponse.json({ success: false, error: "Scan result not found." }, { status: 404 });
    }

    const rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));
    return buildResponse(scanId, rawFindings);
  }

  const runStatus = await getRunStatus(scanId);

  if (runStatus.status === "not_found") {
    return NextResponse.json({ success: false, error: "Scan not found." }, { status: 404 });
  }

  if (runStatus.status === "queued" || runStatus.status === "in_progress") {
    return NextResponse.json({ success: true, status: "scanning", data: null });
  }

  if (runStatus.status === "completed" && runStatus.conclusion !== "success") {
    return NextResponse.json({
      success: false,
      status: "error",
      error: `Scan failed (conclusion: ${runStatus.conclusion ?? "unknown"}).`,
    });
  }

  const resultBuffer = await getArtifactFile(scanId, "result.json");
  if (!resultBuffer) {
    return NextResponse.json(
      { success: false, error: "Scan artifact not found or expired." },
      { status: 404 }
    );
  }

  let rawFindings: Record<string, unknown>;
  try {
    rawFindings = JSON.parse(resultBuffer.toString("utf-8"));
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to parse scan results." },
      { status: 500 }
    );
  }

  return buildResponse(scanId, rawFindings);
}

async function buildResponse(scanId: string, rawFindings: Record<string, unknown>) {
  const { getFindings, getOverview } = await loadEngine();

  const payload = rawFindings as unknown as ScanPayload;

  const rawFindingsList = (payload as unknown as Record<string, unknown>).findings as Record<string, unknown>[] | undefined ?? [];
  const aiMap = new Map(
    rawFindingsList
      .filter(f => f.aiEnhanced)
      .map(f => [f.id as string, {
        aiEnhanced: true,
        aiFixDescription: f.ai_fix_description as string | null ?? null,
        aiFixCode: f.ai_fix_code as string | null ?? null,
        aiFixCodeLang: f.ai_fix_code_lang as string | null ?? null,
      }])
  );

  const findings: EnrichedFinding[] = getFindings(payload, {
    screenshotUrlBuilder: (rawPath) =>
      `/api/scan/${scanId}/screenshot?path=${encodeURIComponent(rawPath)}`,
  }).map((f: EnrichedFinding) => {
    const ai = aiMap.get(f.id);
    return ai ? { ...f, ...ai } : f;
  });

  const {
    totals,
    score,
    label: scoreLabel,
    wcagStatus,
    personaGroups,
    quickWins,
    targetUrl,
    detectedStack,
    totalFindings,
  } = getOverview(findings, payload) as AuditSummary;

  const metadata = (payload as unknown as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
  const methodology = metadata?.testingMethodology as Record<string, unknown> | undefined;
  const conformanceLevel = (methodology?.conformance_level as string) ?? null;
  const bestPractices = (methodology?.best_practices as boolean) ?? false;

  const rawPatternFindings = (payload as unknown as Record<string, unknown>).patternFindings as Record<string, unknown> | null | undefined;
  const patternSummary = rawPatternFindings?.summary as { total: number; confirmed: number; potential: number } | undefined;
  const repoScanned = rawPatternFindings?.project_dir as string | undefined;
  const patternFindings = (rawPatternFindings?.findings as unknown[]) ?? null;
  const aiEnhancedCount = aiMap.size;

  return NextResponse.json({
    success: true,
    status: "completed",
    data: {
      targetUrl,
      scanDate: new Date().toISOString(),
      score,
      scoreLabel,
      wcagStatus,
      totals,
      personaGroups,
      findings,
      quickWins,
      totalFindings,
      detectedStack,
      conformanceLevel,
      bestPractices,
      patternSummary: patternSummary ?? null,
      repoScanned: repoScanned ?? null,
      patternFindings: patternFindings ?? null,
      aiEnhancedCount,
    },
  });
}
